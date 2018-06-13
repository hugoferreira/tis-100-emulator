import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { ComputingUnit, Source } from './unit'
import { GeneticMutator, GeneticSplicer } from './genetics'
import { Compile, Decompile, SingletonOps, Line } from './language';
import { evaluate, fitness, TestSuite } from './evaluate';
import * as _ from 'lodash'

type Genome = Line[]

class GeneticSearcher {
    mutator = new GeneticMutator()
    splicer = new GeneticSplicer(this.mutator)

    constructor(public populationSize: number = 50) { }

    seedPopulation(seed: Genome) {
        return _.range(0, this.populationSize).map(p => _.clone(seed))
    }

    evaluatePopulation(population: Array<Genome>, test: TestSuite) {
        return Promise.all(population.map(async specimen => {
            const unit = new ComputingUnit()
            unit.compile(specimen != undefined ? Decompile(specimen) : "")
            const result = await evaluate(test, [unit], [unit.up], [unit.down])
            const score = fitness(result, test.out)
            return { specimen, score }
        }))
    }

    elitePopulation(population: Array<{ specimen: Genome, score: number }>, topN: number = 10) {
        return _.take(_.sortBy(population, p => p.score), topN)
    }

    crossoverPopulation(population: Array<{ specimen: Genome, score: number }>, killN: number = 10, topN: number = 10) {
        const pool = _.dropRight(_.sortBy(population, p => p.score), killN)
        const newPool = _.range(0, pool.length - topN).map(n => {
            const [a, b] = _.sampleSize(pool, 2)
            return a.specimen
        })

        return newPool
    }

    async newPool(pop: Array<Genome>, test: TestSuite) {
        const evaluatedPool = await this.evaluatePopulation(pop, test)
        const elite = this.elitePopulation(evaluatedPool)
        return await this.evaluatePopulation(this.crossoverPopulation(evaluatedPool, 10, 10), test)
    }
}

(async () => {
    const p1 = `mov up, acc\nadd acc\nmov acc,down`

    let unit = new ComputingUnit()
    unit.compile(p1)

    // while (true) {
        const test = {
             in: { 0: [1, 2, 3, 4] },
            out: { 0: [2, 4, 6, 8] }
        }

        const g = new GeneticSearcher()
        const pop = g.seedPopulation(unit.program)
        const newPool = await g.newPool(pop, test)

        newPool.forEach(s => console.log(s.score))

        /* let program = mutator.mutate(unit.program)
        unit.compile(program != undefined ? Decompile(program) : "")
        console.log(unit.source) */
    //
})()
