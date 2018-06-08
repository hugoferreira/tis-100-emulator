import { AsyncQueue } from './lib/AsyncQueue'
import { ComputingUnit, Input, Output, Unit } from './unit'
import * as _ from 'lodash'

async function evaluate(testSuite: Array<[number, number]>, units: Array<Unit>, map: [AsyncQueue<number>, AsyncQueue<number>]) {
    const [inValues, outValues] = _.unzip(testSuite)

    const inA = new Input(inValues, map[0])
    const outA = new Output(map[1])

    units.push(inA, outA)

    const step = async () => {
        await Promise.race(units.map(u => u.step()))
        return (outA.result.length !== testSuite.length) ? step() : outA.result
    }

    return _.zip(outValues, await step() as number[])
}

function fitness(testResults: Array<[number, number]>) {
    return testResults.filter(o => o[0] === o[1]).length / testResults.length
}

(async () => {
    const p1 = `mov up, acc\n add acc\n mov acc, down`
    const unit = new ComputingUnit('U11', p1)
    const testSuite = [[1, 2], [2, 4], [3, 6], [4, 9]] as [number, number][]
    const results = await evaluate(testSuite, [unit], [unit.up, unit.down])

    console.debug(fitness(results))
})()
