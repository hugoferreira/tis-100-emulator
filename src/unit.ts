import { AsyncQueue } from './lib/AsyncQueue'
import { Line, Lang, Register } from './language'

export class Unit {
    private program: Line[]

    ip = 0
    nextIp = 0
    acc = 0
    bak = 0
    status = 'IDLE'
    requestedCycles = 0
    executedCycles = 0

    constructor(readonly id: string,
        private source: string,
        public left?: AsyncQueue<number>,
        public right?: AsyncQueue<number>,
        public up?: AsyncQueue<number>,
        public down?: AsyncQueue<number>) {

        this.source = source.trim().toLowerCase().split('\n').map(l => l.trim()).join('\n')

        try {
            this.program = <Line[]>Lang.Program.tryParse(source.toUpperCase())
        } catch {
            this.program = undefined
        }
    }

    private async read(r: Register | number) {
        this.status = 'READ'

        switch (r) {
            case 'ACC': return this.acc
            case 'LEFT': return await this.left.dequeue()
            case 'RIGHT': return await this.right.dequeue()
            case 'UP': return await this.up.dequeue()
            case 'DOWN': return await this.down.dequeue()
            default: return <number>r
        }
    }

    private async write(r: Register, v: number) {
        this.status = 'WRTE'

        switch (r) {
            case 'ACC': this.acc = v; break
            case 'LEFT': await this.left.enqueue(v); break
            case 'RIGHT': await this.right.enqueue(v); break
            case 'UP': await this.up.enqueue(v); break
            case 'DOWN': await this.down.enqueue(v); break
        }
    }

    async step() {
        this.requestedCycles += 1
        if (this.program !== undefined && (this.status == 'RUN' || this.status == 'IDLE')) {
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
            this.executedCycles += 1
        }
    }

    toString() {
        return `[${this.id}: ${this.status}]  ip: ${this.ip}  acc: ${this.acc}  bak: ${this.bak}`
    }

    prettyPrint() {
        return this.source.trim().split('\n').map((l, i) => (i == this.ip) ? `{#00ffff-fg}${l}{/}` : l).join('\n')
    }

    get idleness() { return 1 - (this.executedCycles / this.requestedCycles) }
    get leftValue() { return '?' }
    get rightValue() { return '?' }
}
