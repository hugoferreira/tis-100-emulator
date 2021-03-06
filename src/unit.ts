import { AsyncQueue } from './lib/AsyncQueue'
import { Line, Lang, Register, Compile } from './language'

export type RegisterQueue = AsyncQueue<number>
export type UnitStatus = 'IDLE' | 'READ' | 'WRTE' | 'RUN'

export interface Unit {
    step(): void
    status: UnitStatus
}

export class Source implements Unit {
    status: UnitStatus = 'IDLE'

    constructor(public input: Array<number>, private register: AsyncQueue<number>) { }

    async step() {
        if (this.status == 'RUN' || this.status == 'IDLE') {
            this.status = 'WRTE'
            if (this.input.length > 0) {
                this.register.enqueue(this.input.shift())
                this.status = 'RUN'
            } else this.status = 'IDLE'
        }
    }
}

export class Sink implements Unit {
    status: UnitStatus = 'IDLE'
    result = Array<number>()

    constructor(private register: AsyncQueue<number>) { }

    async step() {
        if (this.status == 'RUN' || this.status == 'IDLE') {
            this.status = 'READ'
            this.result.push(await this.register.dequeue())
            this.status = 'RUN'
        }
    }
}

export class ComputingUnit implements Unit {
    // Code
    public program: Line[]
    private mappings: Array<number>

    // IO
    left  = new AsyncQueue<number>(0)
    right = new AsyncQueue<number>(0)
    up    = new AsyncQueue<number>(0)
    down  = new AsyncQueue<number>(0)

    // Registers
    acc: number
    bak: number

    // Execution
    ip: number
    nextIp: number
    status: UnitStatus
    requestedCycles: number
    executedCycles: number

    constructor(public source?: string) {
       if (source != '') this.compile(source)
       this.reset()
    }


    compile(source: string) {
        try {
            this.source = source.trim().toLowerCase().split('\n').map(l => l.trim()).join('\n')
            const compiled = Compile(source)
            this.program = compiled[0]
            this.mappings = compiled[1]
        } catch {
            this.program = undefined
        }
    }

    reset() {
        this.ip = 0
        this.nextIp = 0
        this.status = 'IDLE'
        this.requestedCycles = 0
        this.executedCycles = 0
        this.acc = 0
        this.bak = 0
    }

    private async read(r: Register | number) {
        this.status = 'READ'

        switch (r) {
            case 'ACC': return this.acc
            case 'LEFT': return await this.left.dequeue()
            case 'RIGHT': return await this.right.dequeue()
            case 'UP': return await this.up.dequeue()
            case 'DOWN': return await this.down.dequeue()
            case 'NIL': return 0
            default: return r as number
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
        let jmpIp = undefined

        if (this.program !== undefined && this.program.length > 0 && (this.status == 'RUN' || this.status == 'IDLE')) {
            this.ip = this.nextIp

            try {
                const exp = this.program[this.ip]

                switch (exp.op) {
                    case 'MOV': await this.write(exp.b, await this.read(exp.a)); break
                    case 'ADD': this.acc += await this.read(exp.a); break
                    case 'SUB': this.acc -= await this.read(exp.a); break

                    case 'JMP': jmpIp = exp.a; break
                    case 'JEZ': if (this.acc == 0) jmpIp = exp.a; break
                    case 'JNZ': if (this.acc != 0) jmpIp = exp.a; break
                    case 'JGZ': if (this.acc > 0) jmpIp = exp.a; break
                    case 'JLZ': if (this.acc < 0) jmpIp = exp.a; break
                    case 'JRO': jmpIp = Math.max(this.ip + await this.read(exp.a), 0); break

                    case 'NEG': this.acc = -this.acc; break
                    case 'SAV': this.bak = this.acc; break
                    case 'SWP': const tmp = this.bak; this.bak = this.acc, this.acc = tmp; break
                }
            } catch {
                console.log(`IP: ${this.ip} Program: ${this.source}`)
            }

            this.nextIp = (jmpIp || (this.ip + 1)) % this.program.length
            this.status = 'RUN'
            this.executedCycles += 1
        }
    }

    toString() {
        return `[${this.status}]  ip: ${this.ip}  acc: ${this.acc}  bak: ${this.bak}`
    }

    prettyPrint() {
        return (this.program !== undefined) ? this.source.trim().split('\n').map((l, i) => (i == this.mappings[this.ip]) ? `{#00ffff-fg}${l}{/}` : l).join('\n') : ''
    }

    get idleness() { return 1 - (this.executedCycles / this.requestedCycles) }
    get leftValue() { return '?' }
    get rightValue() { return '?' }
}
