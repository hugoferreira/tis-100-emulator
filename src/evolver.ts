import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { ComputingUnit, Source } from './unit'
import { GeneticMutator, GeneticSplicer } from './genetics'
import { Compile, Decompile, SingletonOps, Line } from './language';
import { evaluate, TestSuite } from './evaluate';
import * as _ from 'lodash'

type Genome = Line[]

class GeneticSearcher {
    mutator = new GeneticMutator()
    splicer = new GeneticSplicer(this.mutator)

    constructor(public populationSize: number = 50) { }

    fitness(specimen: Genome,
              result: { [key: number]: number[] },
            expected: { [key: number]: number[] }) {
        const alpha = 50
        const beta = 20
        const gamma = 10

        const outUnits = Object.keys(expected)
        const match = _.sum(outUnits.map(out =>
            _.zip(expected[out], result[out]).filter(p => p[0] === p[1]).length
        ))

        const lenghts = _.sum(outUnits.map(out => -Math.abs(expected[out].length - result[out].length)))

        const programSize = 1 / specimen.length
        return alpha * match + beta * lenghts + ((specimen.length > 0) ? gamma * programSize : 0)
    }

    seedPopulation(seed: Genome) {
        return _.range(0, this.populationSize).map(p => _.clone(seed))
    }

    evaluatePopulation(population: Array<Genome>, test: TestSuite) {
        return Promise.all(population.map(async specimen => {
            const unit = new ComputingUnit()
            unit.compile(specimen.length > 0 ? Decompile(specimen) : "")
            const result = evaluate(test, [unit], [unit.up], [unit.down])
            const score = (specimen.length > 0) ? this.fitness(specimen, await result, test.out) : 0
            return { specimen, score }
        }))
    }

    elitePopulation(sortedPop: Array<{ specimen: Genome, score: number }>, topN: number = 10) {
        return _.takeRight(sortedPop, topN)
    }

    selectMates(pool: Array<{ specimen: Genome, score: number }>): [Genome, Genome] {
        const sel1 = _.random(_.head(pool).score, _.last(pool).score - 1, false), sel2 = _.random(_.head(pool).score, _.last(pool).score - 1, false)
        return [ _.findLast(pool, (e) => e.score < sel1).specimen, _.findLast(pool, (e) => e.score < sel2).specimen ]
    }

    crossoverPopulation(sortedPop: Array<{ specimen: Genome, score: number }>, killN: number = 10, topN: number = 10) {
        const pool = _.drop(sortedPop, killN)
        _.map(pool, (num, i) => pool[i].score += (i > 0 ? pool[i - 1].score : Math.abs(_.head(pool).score)))

        return _.range(0, sortedPop.length - topN).map(n => {
            const [a, b] = this.selectMates(pool)
            return this.splicer.splice(a, b)
        })
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
         in: { 0: [1, 4, 1, 3, 2] },
        out: { 0: [2, 8, 2, 6, 4] }
    }

    const g = new GeneticSearcher()
    const pop = g.seedPopulation(unit.program)

    let newPool = pop
    let bestSpecimen = { score: -Infinity, specimen: unit.program }
    let generation = 0

    // console.log(g.fitness(Compile(`mov 4, down`)[0], { 0: [4] }, { 0: [2, 4, 6, 8] }))

    while(generation++ < 10000) {
        newPool = await g.newPool(newPool, test);
        const scores = _.sortBy((await g.evaluatePopulation(newPool, test)), p => p.score)

        console.debug(`Epoch ${generation} Best: ${bestSpecimen.score} Pool Average: ${_.sumBy(scores, p => p.score) / scores.length}`)

        const localBest = _.last(scores)
        if (localBest.score > bestSpecimen.score) {
            bestSpecimen = localBest
            console.log(`[${localBest.score}] ${Decompile(localBest.specimen)}`)
        }
    }
})()
