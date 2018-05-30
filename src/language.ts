import * as P from 'parsimmon'

type BinaryOp = 'MOV'
const BinaryOps: BinaryOp[] = ['MOV']

type UnaryOp = 'ADD' | 'SUB' | 'JRO'
const UnaryOps: UnaryOp[] = ['ADD', 'SUB', 'JRO']

type Jump = 'JEZ' | 'JNZ' | 'JLZ' | 'JGZ' | 'JMP'
const Jumps: Jump[] = ['JEZ', 'JNZ', 'JLZ', 'JGZ', 'JMP']

type SingletonOp = 'NOP' | 'NEG' | 'SAV' | 'SWP'
const SingletonOps: SingletonOp[] = ['NOP', 'NEG', 'SAV', 'SWP']

export type Register = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'ACC' | 'NIL'
const Registers: Register[] = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'ACC', 'NIL']

export type Op = BinaryOp | UnaryOp | SingletonOp | Jump
const Ops: Op[] = Array.prototype.concat(BinaryOps, UnaryOps, SingletonOps, Jumps)

export type Line =
    { op: SingletonOp }
  | { op: UnaryOp, a: number | Register }
  | { op: BinaryOp, a: number | Register, b: Register }
  | { op: Jump, a: number }

export const Lang = P.createLanguage({
    Operand: (r) => P.alt(r.Number, r.Register).trim(r._),
    Separator: (r) => P.string(',').trim(r._),
    Register: () => P.alt(...Registers.map(P.string)),
    Number: () => P.regexp(/-?[0-9]+/).map(Number),
    Label: () => P.regex(/[A-Z]+[A-Z0-9]*/).skip(P.string(':')).map(m => ({ 'label' : m })),
    LabelJump: (r) => P.seq(P.alt(...Jumps.map(P.string)).trim(r._), P.regex(/[A-Z]+[A-Z0-9]*/)).map(p => ({ op : p[0], ref: p[1] })),
    BinOp: (r) => P.seq(P.alt(...BinaryOps.map(P.string)), r.Operand, r.Separator, r.Operand)
        .map(p => ({ 'op': p[0], 'a': p[1], 'b': p[3] })),
    UnOp: (r) => P.seq(P.alt(...UnaryOps.map(P.string)), r.Operand)
        .map(p => ({ 'op': p[0], 'a': p[1] })),
    Op: (r) => P.alt(...SingletonOps.map(P.string)).map(p => ({ 'op': p })),
    Instruction: (r) => P.alt(r.Label, P.alt(r.BinOp, r.UnOp, r.Op, r.LabelJump)).trim(r._),
    Program: (r) => r.Instruction.atLeast(1),
    _: () => P.optWhitespace
})

export function Compile(source: String): [Line[], number[]] {
    // FIXME: Let the grammar handle the trims and casing
    // FIXME: Migrate to a typed grammar
    const firstStage = <Array<any>>Lang.Program.tryParse(source.toUpperCase())
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

    return [<Line[]>result, mappings]
}