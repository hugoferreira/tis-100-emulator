import * as Blessed from 'blessed'
import * as _ from 'lodash'
import { Unit } from './unit'

export class UserInterface {
    screen: Blessed.Widgets.Screen
    updates: (() => void)[][]

    constructor(readonly unitsArray: Unit[][]) {
        this.screen = Blessed.screen({
            smartCSR: true,
            useBCE: true,
            cursor: {
                artificial: true,
                blink: true,
                shape: 'underline',
                color: 'white'
            },
            debug: true,
            dockBorders: true
        })

        this.screen.title = 'TIS100 Emulator';
        this.screen.key(['q', 'C-c'], (ch, key) => process.exit(0))

        const textAreaStyle = {
            tags: true,
            height: 8, width: 23,
            padding: { left: 1 },
            style: {
                fg: '#787878',
                bg: '#454545'
            }
        }

        const infoStyle = {
            ...textAreaStyle, right: 0, height: 2, width: 7, padding: { left: 0, right: 0 },
            align: <'center'>'center',
            style: { bg: '#353535' }
        }

        const arrowStyle = {
            tags: true, right: 0, height: 2, width: 3,
            align: <'center'>'center'
        }

        this.updates = unitsArray.map((r, row) => r.map((unit, col) => {
            const left = 5 + col * 30
            const top = 2 + row * 11

            const box = Blessed.box({ ...textAreaStyle, top, left })
            const acc = Blessed.box({ ...infoStyle, top: 0 })
            const bak = Blessed.box({ ...infoStyle, top: 2 })
            const mode = Blessed.box({ ...infoStyle, top: 4 })

            box.append(acc)
            box.append(bak)
            box.append(mode)
            this.screen.append(box)

            let toRight: Blessed.Widgets.BoxElement
            let fromRight: Blessed.Widgets.BoxElement

            if (unit !== undefined) {
                if (unit.right !== undefined) {
                    toRight = Blessed.box({ ...arrowStyle, top: (top + 6), left: (left + 25) })
                    fromRight = Blessed.box({ ...arrowStyle, top, left: (left + 25) })
                    this.screen.append(toRight)
                    this.screen.append(fromRight)
                }

                return (() => {
                        box.setContent(unit.prettyPrint())
                        acc.setContent(`{#787878-fg}ACC{/}\n${unit.acc.toString()}`)
                        bak.setContent(`{#787878-fg}BAK{/}\n(${unit.acc.toString()})`)
                        mode.setContent(`{#787878-fg}MODE{/}\n${unit.status.toString()}`)

                        if (unit.right !== undefined) {
                            toRight.setContent(`${unit.rightValue}\n{#787878-fg}==>{/}`)
                            fromRight.setContent(`{#787878-fg}<=={/}\n${unit.leftValue}`)
                        }
                })
            } else return (() => {})
        }))

        this.screen.render()
    }

    interval: NodeJS.Timer

    async step() {
        const units = _.flatten(this.unitsArray).filter(u => u !== undefined)
        this.screen.debug(units.map(u => u.toString()).join('\n'))
        await Promise.race(units.map(u => u.step()))
        _.flatten(this.updates).forEach(g => g())
        this.screen.render()
    }

    run() {
        this.interval = setInterval(((self) => () => self.step())(this), 1000)
    }
}