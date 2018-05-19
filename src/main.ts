import * as P from 'parsimmon'
import { AsyncQueue } from './AsyncQueue'
import * as Blessed from 'blessed'
import * as _ from 'lodash'

type BinaryOp = 'MOV'
const BinaryOps: BinaryOp[] = ['MOV']

type UnaryOp = 'ADD' | 'SUB' | 'JRO'
const UnaryOps: UnaryOp[] = ['ADD', 'SUB', 'JRO']

type LabeledJump = 'JEZ' | 'JNZ' | 'JLZ' | 'JGZ'
const LabeledJumps: LabeledJump[] = ['JEZ', 'JNZ', 'JLZ', 'JGZ']

type SingletonOp = 'NOP' | 'NEG' | 'SAV' | 'SWP'
const SingletonOps: SingletonOp[] = ['NOP', 'NEG', 'SAV', 'SWP']

type Register = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'ACC' | 'NIL'
const Registers: Register[] = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'ACC', 'NIL']

type Op = BinaryOp | UnaryOp | SingletonOp
const Ops: Op[] = Array.prototype.concat(BinaryOps, UnaryOps, SingletonOps)

type Line = { op: SingletonOp } | { op: UnaryOp, a: number | Register } |
            { op: BinaryOp, a: number | Register, b: Register }

const Lang = P.createLanguage({
    Operand: (r) => P.alt(r.Number, r.Register).trim(r._),
    Separator: (r) => P.string(',').trim(r._),
    Register: () => P.alt(...Registers.map(P.string)),
    Number: () => P.regexp(/[0-9]+/).map(Number),
    BinOp: (r) => P.seq(P.alt(...BinaryOps.map(P.string)), r.Operand, r.Separator, r.Operand)
                   .map(p => ({'op': p[0], 'a': p[1], 'b': p[3]})),
    UnOp: (r) => P.seq(P.alt(...UnaryOps.map(P.string)), r.Operand)
                  .map(p => ({ 'op': p[0], 'a': p[1] })),
    Op: (r) => P.alt(...SingletonOps.map(P.string)).map(p => ({ 'op': p })),
    Instruction: (r) => P.alt(r.BinOp, r.UnOp, r.Op).trim(r._),
    Program: (r) => r.Instruction.atLeast(1),
    _: () => P.optWhitespace
})

class Unit {
    private program: Line[]

    ip = 0
    nextIp = 0
    acc = 0
    bak = 0
    status = 'IDLE'

    constructor(readonly id: string,
                private source: string,
                public left?: AsyncQueue<number>,
                public right?: AsyncQueue<number>,
                public up?: AsyncQueue<number>,
                public down?: AsyncQueue<number>) {
        try {
            this.program = <Line[]>Lang.Program.tryParse(source.trim().toUpperCase())
        } catch {
            this.program = undefined
        }
    }

    private async read(r: Register | number) {
        this.status = 'READ'

        switch (r) {
            case 'ACC': return this.acc
            case 'LEFT': return this.left.dequeue()
            default: return <number>r
        }
    }

    private async write(r: Register, v: number) {
        this.status = 'WRTE'

        switch (r) {
            case 'ACC': this.acc = v; break
            case 'RIGHT': this.right.enqueue(v); break
        }
    }

    async step() {
        if (this.program !== undefined) {
            this.ip = this.nextIp
            const exp = this.program[this.ip]

            switch (exp.op) {
                case 'MOV': await this.write(exp.b, await this.read(exp.a)); break
                case 'ADD': this.acc += await this.read(exp.a); break
                case 'SUB': this.acc -= await this.read(exp.a); break
                case 'SAV': this.bak = this.acc; break
                case 'SWP': const tmp = this.bak; this.bak = this.acc, this.acc = tmp; break
            }

            this.nextIp = (this.ip + 1) % this.program.length
            this.status = 'RUN'
        }
    }

    toString() {
        return `[${this.id}: ${this.status}]  ip: ${this.ip}  acc: ${this.acc}  bak: ${this.bak}`
    }

    prettyPrint() {
        return this.source.trim().split('\n').map((l, i) => (i == this.ip) ? `{#00ffff-fg}${l}{/}` : l).join('\n')
    }

    peekLeft() {
        if (this.left !== undefined) {
            const r = this.left.last
            return (r !== undefined) ? r.toString() : '?'
        } return '?'
    }

    peekRight() {
        if (this.right !== undefined) {
            const r = this.right.last
            return (r !== undefined) ? r.toString() : '?'
        } return '?'
    }
}



class UserInterface {
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

            if (col !== r.length - 1) {
                toRight = Blessed.box({ ...arrowStyle, top: (top + 6), left: (left + 25) })
                fromRight = Blessed.box({ ...arrowStyle, top, left: (left + 25) })
                this.screen.append(toRight)
                this.screen.append(fromRight)
            }

            return (() => {
                if (unit != undefined) {
                    box.setContent(unit.prettyPrint())
                    acc.setContent(`{#787878-fg}ACC{/}\n${unit.acc.toString()}`)
                    bak.setContent(`{#787878-fg}BAK{/}\n(${unit.acc.toString()})`)
                    mode.setContent(`{#787878-fg}MODE{/}\n${unit.status.toString()}`)

                    if (col !== r.length - 1) {
                        toRight.setContent(`${unit.peekRight()}\n{#787878-fg}==>{/}`)
                        fromRight.setContent(`{#787878-fg}<=={/}\n${0}`)
                    }
                }
            })
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
