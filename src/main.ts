import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { Unit } from './unit'

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

    const u1u2 = new AsyncQueue<number>(0)

    const unitsArray = [
        [new Unit('U1', p2, undefined, u1u2), new Unit('U2', p3, u1u2, undefined), undefined, undefined],
        [undefined, undefined, undefined, undefined],
        [undefined, undefined, undefined, undefined]
    ]

    const gui = new UserInterface(unitsArray)
    gui.run()
})()
