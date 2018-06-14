import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { ComputingUnit, Source } from './unit'
import { GeneticMutator, GeneticSplicer } from './genetics'
import { Compile, Decompile, SingletonOps, Line } from './language';
import { evaluate, TestSuite, TestResult } from './evaluate';
import * as _ from 'lodash'

type Genome = Line[]
type GenomeHash = String

class GeneticSearcher {
    readonly alpha = 50
    readonly beta = 5
    readonly gamma = 1
    readonly delta = -1000
    readonly epsilon = -0.01

    mutator = new GeneticMutator()
    splicer = new GeneticSplicer(this.mutator)
    memoizer = new Map<GenomeHash, number>()

    constructor(public populationSize: number = 100) { }

    fitness(specimen: Genome, result: TestResult, expected: { [key: number]: number[] }) {
        const outUnits = Object.keys(expected)
        const match = _.sum(outUnits.map(out =>
            _.zip(expected[out], result.out[out]).filter(p => p[0] === p[1]).length
        ))

        const lenghts = _.sum(outUnits.map(out => -Math.abs(expected[out].length - result.out[out].length)))

        const programSize = 1 / specimen.length

        return this.alpha * match +
               this.beta * lenghts +
               ((specimen.length > 0) ? this.gamma * programSize : 0) +
               this.epsilon * result.statistics.cycles +
               this.delta * _.sum(result.statistics.inputLeft)
    }

    seedPopulation(seed: Genome) {
        return _.range(0, this.populationSize).map(p => _.clone(seed))
    }

    evaluatePopulation(population: Array<Genome>, test: TestSuite) {
        return Promise.all(population.map(async specimen => {
            const code = specimen.length > 0 ? Decompile(specimen) : ""
            let score = this.memoizer.get(code)

            if (score == undefined) {
                const unit = new ComputingUnit()
                unit.compile(code)

                const result = evaluate(test, [unit], [unit.up], [unit.down])
                score = (specimen.length > 0) ? this.fitness(specimen, await result, test.out) : 0
                this.memoizer.set(code, score)
            }

            return { specimen, score }
        }))
    }

    elitePopulation(sortedPop: Array<{ specimen: Genome, score: number }>, topN: number = 10) {
        return _.takeRight(sortedPop, topN)
    }

    selectMate(pool: Array<{ specimen: Genome, score: number }>): Genome {
        const sel = _.random(0, _.last(pool).score - 1, false)
        return _.find(pool, (e) => e.score >= sel).specimen
    }

    crossoverPopulation(sortedPop: Array<{ specimen: Genome, score: number }>, killN: number = 10, topN: number = 10) {
        const pool = _.drop(sortedPop, killN)
        const first = _.head(pool).score
        if (first < 0) _.map(pool, (num, i) => pool[i].score -= first)

        _.map(pool, (num, i) => pool[i].score += (i > 0 ? pool[i - 1].score : 0))

        return _.range(0, sortedPop.length - topN).map(
            n => this.splicer.splice(this.selectMate(pool), this.selectMate(pool))
        )
    }

    async newPool(pop: Array<Genome>, test: TestSuite) {
        const evaluatedPool = _.sortBy(await this.evaluatePopulation(pop, test), p => p.score)
        const elite = _.map(this.elitePopulation(evaluatedPool), 'specimen')
        const newPool = this.crossoverPopulation(evaluatedPool, 10, 10)

        return _.concat(elite, newPool)
    }
}

(async () => {
    const p1 = `mov up, acc\nmov acc, down`

    let unit = new ComputingUnit()
    unit.compile(p1)

    const test = {
         in: { 0: [15, 7, 10, 2, 20] },
        out: { 0: [31, 15, 21, 5, 41] }
    }

    const g = new GeneticSearcher()
    const pop = g.seedPopulation(unit.program)

    let newPool = pop
    let bestSpecimen = { score: -Infinity, specimen: unit.program }
    let generation = 0

    while(generation++ < 100000) {
        newPool = await g.newPool(newPool, test);
        const scores = _.sortBy((await g.evaluatePopulation(newPool, test)), p => p.score)

        if (generation % 1000 == 0) console.debug(`Epoch ${generation} Best: ${bestSpecimen.score} Pool Average: ${_.sumBy(scores, p => p.score) / scores.length}`)

        const localBest = _.last(scores)
        if (localBest.score > bestSpecimen.score) {
            bestSpecimen = localBest
            console.log(`[${localBest.score}] ${Decompile(localBest.specimen)}`)
        }
    }
})()
