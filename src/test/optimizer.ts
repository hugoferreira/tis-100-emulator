import { ComputingUnit } from '../unit'
import { Optimize, Compile, Decompile } from '../language'

(async () => {
    const p1 = `mov nil, acc`
    console.debug(Decompile(Optimize(Compile(p1)[0])))
})()
