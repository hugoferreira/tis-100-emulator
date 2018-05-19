import { AsyncQueue } from './lib/AsyncQueue'
import { UserInterface } from './consoleui'
import { Unit } from './unit'

const p2 =
`mov 5, acc
add acc
sub acc
add 20
mov acc, right`

const p3 =
`sub left
add 10
swp`

const u1u2 = new AsyncQueue<number>(1)
const u2u3 = new AsyncQueue<number>(1)
const u3u4 = new AsyncQueue<number>(1)

const unitsArray = [
    [new Unit('U1', p2, undefined, u1u2), new Unit('U2', p3, u1u2, u2u3), new Unit('U3', '', u2u3, u3u4), new Unit('U4', '', u3u4, undefined)],
    [undefined, undefined, undefined, undefined],
    [undefined, undefined, undefined, undefined]
]

const gui = new UserInterface(unitsArray)
gui.run()
