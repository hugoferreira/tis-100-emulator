import * as P from 'parsimmon'
import * as _ from 'lodash'

export type BinaryOp = 'MOV'
export const BinaryOps: BinaryOp[] = ['MOV']

export type UnaryOp = 'ADD' | 'SUB' | 'JRO'
export const UnaryOps: UnaryOp[] = ['ADD', 'SUB', 'JRO']

export type Jump = 'JEZ' | 'JNZ' | 'JLZ' | 'JGZ' | 'JMP'
export const Jumps: Jump[] = ['JEZ', 'JNZ', 'JLZ', 'JGZ', 'JMP']

export type SingletonOp = 'NOP' | 'NEG' | 'SAV' | 'SWP'
export const SingletonOps: SingletonOp[] = ['NOP', 'NEG', 'SAV', 'SWP']

export type Register = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'ACC' | 'NIL'
export const Registers: Register[] = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'ACC', 'NIL']

export type Op = BinaryOp | UnaryOp | SingletonOp | Jump
export const Ops: Op[] = Array.prototype.concat(BinaryOps, UnaryOps, SingletonOps, Jumps)

export function is<U, T extends U>(op: U, collection: Array<T>): op is T {
    return collection.includes(op as T)
}

export type Line =
    { op: SingletonOp }
  | { op: UnaryOp, a: number | Register }
  | { op: BinaryOp, a: number | Register, b: Register }
  | { op: Jump, a: number }

export type Program = Line[]

const keywords = <T extends string>(ss: T[]) => P.alt(...ss.map(P.string)).trim(P.optWhitespace) as P.Parser<T>

export const Lang = P.createLanguage({
        Operand: (r) => P.alt(r.Number, r.Register).trim(r._),
      Separator: ()  => P.string(','),
       Register: ()  => keywords(Registers),
         Number: ()  => P.regexp(/-?[0-9]+/).map(Number),
        LabelId: ()  => P.regexp(/[A-Z]+[A-Z0-9]*/),
          Label: (r) => r.LabelId.skip(P.string(':')).map(m => ({ label: m })),
      LabelJump: (r) => P.seq(keywords(Jumps), r.LabelId)
                         .map(p => ({ op: p[0], ref: p[1] })),
          BinOp: (r) => P.seq(keywords(BinaryOps), r.Operand, r.Separator, r.Operand)
                         .map(p => ({ op: p[0], a: p[1], b: p[3] })),
           UnOp: (r) => P.seq(keywords(UnaryOps), r.Operand)
                         .map(p => ({ op: p[0], a: p[1] })),
             Op: ()  => P.alt(keywords(SingletonOps))
                         .map(p => ({ op: p })),
    Instruction: (r) => P.alt(r.BinOp, r.UnOp, r.Op, r.LabelJump),
        Program: (r) => P.alt(r.Label, r.Instruction).trim(r._).atLeast(1),
              _: ()  => P.optWhitespace
})

export function Decompile(program: Program) {
    return program.map(line => {
        if ('b' in line)
            return `${line.op} ${line.a}, ${line.b}`
        if ('a' in line)
            return `${line.op} ${line.a}`
        else
            return `${line.op}`
    }).join('\n')
}

export function Compile(source: String): [Program, number[]] {
    // FIXME: Let the grammar handle the trims and casing
    // FIXME: Migrate to a typed grammar
    const firstStage = Lang.Program.tryParse(source.toUpperCase()) as Array<any>
    const labels = new Map<String, number>()
    const mappings = Array<number>()
    const result = Array<Line>()

    firstStage.forEach((op, lno) => {
        if ('label' in op) labels.set(op.label, result.length)
        else {
            if ('ref' in op) op.a = labels.get(op.ref)
            result.push(op)
            mappings.push(lno)
        }
    })

    return [result as Line[], mappings]
}

function isNumber(value: Register | number) {
    return !isNaN(Number(value.toString()))
}

function Peephole(p: Program): Program {
    if (p == undefined || p.length == 0) return []

    const [a, ...a_remaining] = p

    if (a.op == 'SUB' && isNumber(a.a)) {
        return [{ op: 'ADD', a: (-<number>a.a) }, ...a_remaining]
    }

    if (a.op == 'SUB' && a.a == 'ACC') {
        return [{ op: 'MOV', a: 0, b: 'ACC' }, ...a_remaining]
    }

    if (a.op == 'MOV' && a.a == 'NIL' && a.b == 'ACC') {
        return [{ op: 'MOV', a: 0, b: 'ACC' }, ...a_remaining]
    }

    if (a.op == 'MOV' && (a.a == 'NIL' || a.a == 'ACC') && a.b == 'NIL') {
        return a_remaining
    }

    if (a.op == 'MOV' && (a.a == 'ACC') && a.b == 'ACC') {
        return a_remaining
    }

    const [b, ...ab_remaining] = a_remaining

    if (b != undefined) {
        if (a.op == 'ADD' && b.op == 'ADD' && isNumber(a.a) && isNumber(b.a)) {
            return [{ op: 'ADD', a: (<number>a.a + <number>b.a) }, ...ab_remaining]
        }

        if (a.op == 'MOV' && b.op == 'MOV' && isNumber(a.a) && isNumber(b.a) && a.b == 'ACC' && b.b == 'ACC') {
            return [{ op: 'MOV', a: b.a, b: 'ACC' }, ...ab_remaining]
        }

        if (a.op == 'SWP' && b.op == 'SWP') {
            return ab_remaining
        }

        if (a.op == 'NEG' && b.op == 'NEG') {
            return ab_remaining
        }
    }

    return [a, ...Optimize(a_remaining)]
}

export function Optimize(p: Program): Program {
    if (p == undefined || p.length == 0) return []

    let newSolution: Program

    do {
        p = newSolution || p
        newSolution = Peephole(p)
    } while (!_.isEqual(newSolution, p))

    return p
}