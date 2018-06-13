import { AsyncQueue } from './lib/AsyncQueue'
import { Source, Sink, Unit, RegisterQueue } from './unit'
import * as _ from 'lodash'

export type TestSuite = {  in: { [key: number]: number[] },
                          out: { [key: number]: number[] } }

export function fitness(  result: { [key: number]: number[] },
                        expected: { [key: number]: number[] }) {
    const outUnits = Object.keys(expected)
    return outUnits.map(out =>
        _.zip(expected[out], result[out]).filter(p => p[0] == p[1]).length / expected[out].length
    ).reduce((acc, e) => acc + e, 0) / outUnits.length
}

export async function evaluate(testSuite: TestSuite,
                               units: Array<Unit>,
                               inputs: RegisterQueue[],
                               outputs: RegisterQueue[],
                               maximumSteps = 100): Promise<{ [key: number]: number[] }>  {

    const ins = inputs.map((port, ix) => new Source(_.clone(testSuite.in[ix]), port))
    const outs = outputs.map((port, ix) => new Sink(port))

    units = units.concat(ins).concat(outs)

    const simulate = async () => {
        let steps = 0
        while (steps++ < maximumSteps && outs.every((out, ix) => out.result.length !== testSuite.out[ix].length)) {
            await Promise.race(units.map(u => u.step()))
        }

        return outs.map(out => out.result)
    }

    return (await simulate()).reduce((acc, out, ix) => ({...acc, [ix]: out }), {})
}