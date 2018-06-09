import { AsyncQueue } from './lib/AsyncQueue'
import { Input, Output, Unit, RegisterQueue } from './unit'

type TestSuite = {  in: { [key: number]: number[] },
                   out: { [key: number]: number[] } }

export async function evaluate(testSuite: TestSuite,
                               units: Array<Unit>,
                               inputs: RegisterQueue[],
                               outputs: RegisterQueue[]) {

    const ins = inputs.map((port, ix) => new Input(testSuite.in[ix], port))
    const outs = outputs.map((port, ix) => new Output(port))

    units = units.concat(ins).concat(outs)

    const simulate = async () => {
        while (outs.every((out, ix) => out.result.length !== testSuite.out[ix].length)) {
            await Promise.race(units.map(u => u.step()))
        }

        return outs.map(out => out.result)
    }

    return (await simulate()).reduce((acc, out, ix) => ({...acc, [ix]: out }), {})
}