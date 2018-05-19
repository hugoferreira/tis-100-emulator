import { AsyncQueue } from './lib/AsyncQueue'
import { Line, Lang, Register } from './language'

export class Unit {
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
