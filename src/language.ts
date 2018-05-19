import * as P from 'parsimmon'

type BinaryOp = 'MOV'
const BinaryOps: BinaryOp[] = ['MOV']

type UnaryOp = 'ADD' | 'SUB' | 'JRO'
const UnaryOps: UnaryOp[] = ['ADD', 'SUB', 'JRO']

type LabeledJump = 'JEZ' | 'JNZ' | 'JLZ' | 'JGZ'
const LabeledJumps: LabeledJump[] = ['JEZ', 'JNZ', 'JLZ', 'JGZ']

type SingletonOp = 'NOP' | 'NEG' | 'SAV' | 'SWP'
const SingletonOps: SingletonOp[] = ['NOP', 'NEG', 'SAV', 'SWP']

export type Register = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'ACC' | 'NIL'
const Registers: Register[] = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'ACC', 'NIL']

export type Op = BinaryOp | UnaryOp | SingletonOp
const Ops: Op[] = Array.prototype.concat(BinaryOps, UnaryOps, SingletonOps)

export type Line =
    { op: SingletonOp }
  | { op: UnaryOp, a: number | Register }
  | { op: BinaryOp, a: number | Register, b: Register }

export const Lang = P.createLanguage({
    Operand: (r) => P.alt(r.Number, r.Register).trim(r._),
    Separator: (r) => P.string(',').trim(r._),
    Register: () => P.alt(...Registers.map(P.string)),
    Number: () => P.regexp(/[0-9]+/).map(Number),
    BinOp: (r) => P.seq(P.alt(...BinaryOps.map(P.string)), r.Operand, r.Separator, r.Operand)
        .map(p => ({ 'op': p[0], 'a': p[1], 'b': p[3] })),
    UnOp: (r) => P.seq(P.alt(...UnaryOps.map(P.string)), r.Operand)
        .map(p => ({ 'op': p[0], 'a': p[1] })),
    Op: (r) => P.alt(...SingletonOps.map(P.string)).map(p => ({ 'op': p })),
    Instruction: (r) => P.alt(r.BinOp, r.UnOp, r.Op).trim(r._),
    Program: (r) => r.Instruction.atLeast(1),
    _: () => P.optWhitespace
})