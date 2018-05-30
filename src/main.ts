import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { Unit } from './unit'
import { Line, Lang, Register, Compile } from './language'

(async () => {
    const p2 = `mov 5, acc
                add acc
                sub acc
                add 20
                mov acc, right
                sub right`

    const p3 = `sub left
                add 10
                swp
                mov acc, left`

    const p4 = ` mov 1, acc
                repeat:
                 add acc
                 jmp repeat`

    const p5 = ` mov 5, acc
                repeat:
                 sub 1
                 jnz repeat`

    // const p2 = 'mov up, down'

    const u11u12 = new AsyncQueue<number>(0)
    const u11u21 = new AsyncQueue<number>(0)
    const u21u31 = new AsyncQueue<number>(0)

    const input = new AsyncQueue<number>(0)

    input.enqueue(10)
    input.enqueue(20)
    input.enqueue(30)
    input.enqueue(40)

    const unitsArray = [
        [new Unit('U11', p2, undefined, u11u12, input, u11u21), new Unit('U12', p3, u11u12, undefined), new Unit('U12', p5, undefined, undefined), undefined],
        [undefined, undefined, undefined, undefined],
        [undefined, undefined, undefined, undefined]
    ]

    const gui = new UserInterface(unitsArray)
    gui.run()
})()
