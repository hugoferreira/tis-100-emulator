import { AsyncQueue } from './lib/AsyncQueue'
import { Source, Sink, Unit, RegisterQueue } from './unit'
import * as _ from 'lodash'

export type TestSuite = {  in: { [key: number]: number[] },
                          out: { [key: number]: number[] } }

export type TestResult = {
    out: { [key: number]: number[] }
    statistics?: {
        cycles?: number
        inputLeft?: number[]
    }
}

export async function evaluate(testSuite: TestSuite,
                               units: Array<Unit>,
                               inputs: RegisterQueue[],
                               outputs: RegisterQueue[],
                               maximumSteps = 100): Promise<TestResult>  {

    const ins = inputs.map((port, ix) => new Source(_.clone(testSuite.in[ix]), port))
    const outs = outputs.map((port, ix) => new Sink(port))

    units = units.concat(ins).concat(outs)

    const simulate = async () => {
        let steps = 0
        while (steps++ < maximumSteps && outs.every((out, ix) => out.result.length !== testSuite.out[ix].length)) {
            await Promise.race(units.map(u => u.step()))
        }

        return {
            outputs: outs.map(out => out.result),
            steps: steps
        }
    }

    const results = await simulate()

    return {
        out: (results.outputs).reduce((acc, out, ix) => ({...acc, [ix]: out }), {}),
        statistics: {
            cycles: results.steps,
            inputLeft: ins.map(i => i.input.length)
        }
    }
}