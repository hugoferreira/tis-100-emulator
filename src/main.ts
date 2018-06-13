import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { ComputingUnit, Source } from './unit'
import { GeneticMutator, GeneticSplicer } from './genetics'
import { Compile, Decompile, SingletonOps } from './language';
import { evaluate } from './evaluate';

(async () => {
    const p1 = `mov up, down
                mov up, down
                mov up, down
                mov up, down`

    const p2 = `sub left
                add 10
                swp
                mov acc, left`

    const p3 = ` mov 1, acc
                repeat:
                 add acc
                 jmp repeat`

    const p4 = ` mov -1, acc
                repeat:
                 nop
                 jro acc`

    let mutator = new GeneticMutator()

    let unit = new ComputingUnit()
    unit.compile(p1)

    while (true) {
        let result = await evaluate({in: [[1,2], [2,3], [7, 8]], out: [[3], [5], [15]]}, [unit], [unit.up], [unit.down])
            console.log(result)
            console.log(unit.program)
        let program = mutator.mutate(unit.program)
        unit.compile(program != undefined ? Decompile(program) : "")    
    }

})()
