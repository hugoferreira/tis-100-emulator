import * as Blessed from 'blessed'
import * as _ from 'lodash'
import { ComputingUnit } from './unit'

export class UserInterface {
    screen: Blessed.Widgets.Screen
    updates: (() => void)[][]

    constructor(readonly unitsArray: ComputingUnit[][]) {
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

            if (unit !== undefined) {
                const box = Blessed.box({ ...textAreaStyle, top, left })
                this.screen.append(box)

                const acc = Blessed.box({ ...infoStyle, top: 0 })
                const bak = Blessed.box({ ...infoStyle, top: 2 })
                const mode = Blessed.box({ ...infoStyle, top: 4 })
                const idle = Blessed.box({ ...infoStyle, top: 6 })

                box.append(acc)
                box.append(bak)
                box.append(mode)
                box.append(idle)

                let toRight: Blessed.Widgets.BoxElement
                let fromRight: Blessed.Widgets.BoxElement
                let fromUp: Blessed.Widgets.BoxElement
                let toUp: Blessed.Widgets.BoxElement

                if (unit.right !== undefined) {
                    toRight = Blessed.box({ ...arrowStyle, top: (top + 6), left: (left + 25) })
                    fromRight = Blessed.box({ ...arrowStyle, top, left: (left + 25) })
                    toUp = Blessed.box({ ...arrowStyle, top: (top - 3), left })
                    fromUp = Blessed.box({ ...arrowStyle, top: (top - 3), left: (left + 20) })
                    this.screen.append(toRight)
                    this.screen.append(fromRight)
                    this.screen.append(fromUp)
                    this.screen.append(toUp)
                }

                return (() => {
                        box.setContent(unit.prettyPrint())
                        acc.setContent(`{#787878-fg}ACC{/}\n${unit.acc.toString()}`)
                        bak.setContent(`{#787878-fg}BAK{/}\n(${unit.bak.toString()})`)
                        mode.setContent(`{#787878-fg}MODE{/}\n${unit.status.toString()}`)
                        idle.setContent(`{#787878-fg}IDLE{/}\n${Math.round(unit.idleness * 100).toString()}%`)

                        if (unit.right !== undefined) {
                            toRight.setContent(`${unit.rightValue}\n{#787878-fg}==>{/}`)
                            fromRight.setContent(`{#787878-fg}<=={/}\n${unit.leftValue}`)
                            toUp.setContent(`{#787878-fg}^{/} ${unit.rightValue}`)
                            fromUp.setContent(`${unit.leftValue} {#787878-fg}v{/}`)
                        }
                })
            } else {
                this.screen.append(Blessed.box({ ...textAreaStyle, top, left, align: 'center', content: '-//-' }))
                return (() => {})
            }
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