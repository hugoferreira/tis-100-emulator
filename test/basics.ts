import { ComputingUnit } from '../src/unit'
import { evaluate } from '../src/evaluate'

(async () => {
    const p1 = `mov up, acc\n add right\n mov acc, down`
    const p2 = `mov up, left`

    const u1 = new ComputingUnit('U11', p1)
    const u2 = new ComputingUnit('U12', p2)

    u2.left = u1.right

    const testSuite = {
        in: { 0: [1, 2, 3, 4], 1: [5, 6, 7, 8] },
        out: { 0: [6, 8, 10, 12] }
    }

    const results = await evaluate(testSuite, [u1, u2], [u1.up, u2.up], [u1.down])
    console.debug(results[0])
})()
