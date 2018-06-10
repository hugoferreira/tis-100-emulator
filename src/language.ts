import * as P from 'parsimmon'

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

export type Line = 
    { type: 'Sng', op: SingletonOp } 
  | { type: 'Unr', op: UnaryOp, a: number | Register } 
  | { type: 'Bin', op: BinaryOp, a: number | Register, b: Register } 
  | { type: 'Jmp', op: Jump, a: number }

const keywords = <T extends string>(ss: T[]) => P.alt(...ss.map(P.string)).trim(P.optWhitespace) as P.Parser<T>

export const Lang = P.createLanguage({
        Operand: (r) => P.alt(r.Number, r.Register).trim(r._),
      Separator: ()  => P.string(','),
       Register: ()  => keywords(Registers),
         Number: ()  => P.regexp(/-?[0-9]+/).map(Number),
        LabelId: ()  => P.regexp(/[A-Z]+[A-Z0-9]*/),
          Label: (r) => r.LabelId.skip(P.string(':')).map(m => ({ label: m })),
      LabelJump: (r) => P.seq(keywords(Jumps), r.LabelId)
                         .map(p => ({ type: 'Jmp', op: p[0], ref: p[1] })),
          BinOp: (r) => P.seq(keywords(BinaryOps), r.Operand, r.Separator, r.Operand)
                         .map(p => ({ type: 'Bin', op: p[0], a: p[1], b: p[3] })),
           UnOp: (r) => P.seq(keywords(UnaryOps), r.Operand)
                         .map(p => ({ type: 'Unr', op: p[0], a: p[1] })),
             Op: ()  => P.alt(keywords(SingletonOps))
                         .map(p => ({ type: 'Sng', op: p })),
    Instruction: (r) => P.alt(r.BinOp, r.UnOp, r.Op, r.LabelJump),
        Program: (r) => P.alt(r.Label, r.Instruction).trim(r._).atLeast(1),
              _: ()  => P.optWhitespace
})

export function Decompile(program: Line[]) {
    return program.map(line => {
        if ('b' in line)
            return `${line.op} ${line.a}, ${line.b}`
        if ('a' in line)
            return `${line.op} ${line.a}`
        else
            return `${line.op}`
    }).join('\n')
}

export function Compile(source: String): [Line[], number[]] {
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