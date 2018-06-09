import { ComputingUnit } from '../unit'
import { evaluate } from '../evaluate'

(async () => {
    const u1 = new ComputingUnit(`mov up, acc\n add right\n mov acc, down`)
    const u2 = new ComputingUnit(`mov up, left`)

    u2.left = u1.right

    const testSuite = {
         in: { 0: [1, 2, 3, 4],
               1: [5, 6, 7, 8] },
        out: { 0: [6, 8, 10, 12] }
    }

    const results = await evaluate(testSuite, [u1, u2], [u1.up, u2.up], [u1.down])
    console.debug(results[0])
})()
