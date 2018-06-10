import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { ComputingUnit, Source } from './unit'
import { GeneticMutator } from './genetics'
import { Compile, SingletonOps } from './language';

(async () => {
    const p1 = `mov 5, acc
                add acc
                sub acc
                add 20
                mov  acc,    right
                sub  right `

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

    const unitsArray = [0, 1, 2].map(r => [0, 1, 2, 3].map(c => new ComputingUnit()));

    [0, 1].forEach(r => [0, 1, 2].forEach(c => {
            unitsArray[r][c].right = unitsArray[r][c + 1].left
            unitsArray[r][c].down  = unitsArray[r + 1][c].up
    }))

    unitsArray[0][0].compile(p1)
    unitsArray[0][1].compile(p2)
    unitsArray[0][2].compile(p3)
    unitsArray[0][3].compile(p4)

    let mutator = new GeneticMutator();
    console.log(mutator.mutate(unitsArray[0][0].program, 10))
    unitsArray[0][0].program = mutator.mutate(unitsArray[0][0].program)

    new Source([10, 20, 30, 40], unitsArray[0][0].up)

    const gui = new UserInterface(unitsArray)
    gui.run()
})()
