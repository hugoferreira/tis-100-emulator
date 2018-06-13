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

    fitness(  result: { [key: number]: number[] },
            expected: { [key: number]: number[] }) {
        const alpha = 0.75
        const beta = 100

        const outUnits = Object.keys(expected)
        const match = outUnits.map(out =>
            _.zip(expected[out], result[out]).filter(p => p[0] === p[1]).length / expected[out].length
        ).reduce((acc, e) => acc + e, 0) / outUnits.length

        const lenghts = outUnits.map(out => -Math.abs(expected[out].length - result[out].length))
                                .reduce((acc, e) => acc + e, 0)

        return alpha * match + beta * lenghts
    }

    seedPopulation(seed: Genome) {
        return _.range(0, this.populationSize).map(p => _.clone(seed))
    }

    evaluatePopulation(population: Array<Genome>, test: TestSuite) {
        return Promise.all(population.map(async specimen => {
            const unit = new ComputingUnit()
            unit.compile(specimen.length > 0 ? Decompile(specimen) : "")
            const result = await evaluate(test, [unit], [unit.up], [unit.down])
            const score = this.fitness(result, test.out)
            return { specimen, score }
        }))
    }

    elitePopulation(population: Array<{ specimen: Genome, score: number }>, topN: number = 10) {
        return _.takeRight(_.sortBy(population, p => p.score), topN)
    }

    crossoverPopulation(population: Array<{ specimen: Genome, score: number }>, killN: number = 10, topN: number = 10) {
        const pool = _.drop(_.sortBy(population, p => p.score), killN)
        const popSize = (pool.length + killN) - topN
        const newPool = _.range(0, popSize).map(n => {
            const [a, b] = _.sampleSize(pool, 2)
            return this.splicer.splice(a.specimen, b.specimen) || []
        })

        return newPool
    }

    async newPool(pop: Array<Genome>, test: TestSuite) {
        const evaluatedPool = await this.evaluatePopulation(pop, test)
        const elite = _.map(this.elitePopulation(evaluatedPool), 'specimen')
        const newPool = this.crossoverPopulation(evaluatedPool, 10, 10)

        return _.concat(elite, newPool)
    }
}

(async () => {
    const p1 = `mov up, down`

    let unit = new ComputingUnit()
    unit.compile(p1)

    // while (true) {
        const test = {
             in: { 0: [1, 2, 3, 4] },
            out: { 0: [2, 4, 6, 8] }
        }

        const g = new GeneticSearcher()
        const pop = g.seedPopulation(unit.program)
        let newPool = pop
        let bestSpecimen = { score: -Infinity, specimen: unit.program }
        let generation = 0

        while(true) {
            console.debug(`Generation ${generation++}`)
            newPool = await g.newPool(newPool, test);
            const scores = _.sortBy((await g.evaluatePopulation(newPool, test)), p => p.score)
            const localBest = _.last(scores)

            if (localBest.score > bestSpecimen.score) {
                bestSpecimen = localBest
                console.log(`[${localBest.score}] ${Decompile(localBest.specimen)}`)
            }
        }

        /* let program = mutator.mutate(unit.program)
        unit.compile(program != undefined ? Decompile(program) : "")
        console.log(unit.source) */
    //
})()
