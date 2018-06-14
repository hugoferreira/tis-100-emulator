import { Line, Register, Ops, Registers, is, SingletonOps, UnaryOps, BinaryOps, Jumps, Decompile, Op } from './language'
import * as _ from 'lodash'
import { ComputingUnit } from './unit';

export class GeneticMutator {
  ops: Array<{ op: string, v: number}>

  constructor(readonly mutations = 1,
              readonly mutateProbability = 0.9,
              readonly changeOpProbability = 0.5,
              readonly registerProbability = 0.9,
              readonly alterlinesProbability = 0.1,
              readonly maxProgramSize = 10) {

    this.ops = _.sortBy([
      { op: 'MOV', v: 100 },  { op: 'ADD', v: 100 }, { op: 'SUB', v: 100 },
      { op: 'JRO', v: 0.5 }, { op: 'JEZ', v: 1 }, { op: 'JNZ', v: 1 },
      { op: 'JLZ', v: 1 },   { op: 'JGZ', v: 1 }, { op: 'JMP', v: 1 },
      { op: 'NOP', v: 0 },   { op: 'NEG', v: 1 }, { op: 'SAV', v: 1 },
      { op: 'SWP', v: 1 }], o => o.v)

    _.map(this.ops, (num, i) => this.ops[i].v += (i > 0 ? this.ops[i - 1].v : 0))
  }

  public mutate(program: Line[]): Line[] {
    let copy = program != undefined ? _.clone(program) : []
    for (let m = 0; m < this.mutations; m++)
      copy = this.mutateOne(copy)
    return copy
  }

  private mutateOne(program: Line[]): Line[] {
    if (program.length > 0 && Math.random() < this.mutateProbability)
      return this.mutateExisting(program)
    else if (Math.random() < this.alterlinesProbability) {
      return this.addRemoveLine(program)
    }
  }

  private mutateExisting(program: Line[]): Line[] {
    let lineNumber = Math.floor(Math.random() * program.length)
    program[lineNumber] = this.mutateLine(program, program[lineNumber])
    return program
  }

  private mutateLine(program: Line[], line: Line): Line {
    if (is(line.op, SingletonOps) || Math.random() < this.changeOpProbability)
      return this.mutateOp(program, line)
    else
      return this.mutateParams(program, line)
  }

  private mutateOp(program: Line[], line): Line {
    return this.generateLine(program)
  }

  private mutateParams(program: Line[], line: Line): Line {
    if (is(line.op, UnaryOps)) return { op: line.op, a: this.generateNumberOrRegister() }
    if (is(line.op, BinaryOps)) return { op: line.op, a: this.generateNumberOrRegister(), b: this.generateRegister() }
    if (is(line.op, Jumps)) return { op: line.op, a: this.generateAddress(program) }
  }

  private randomOp() {
    return _.findLast(this.ops, (e) => e.v < _.random(0, _.last(this.ops).v - 1, false)).op
  }

  private generateLine(program: Line[]): Line {
    let op = this.randomOp()
    if (is(op, SingletonOps)) return { op }
    if (is(op, UnaryOps)) return { op, a: this.generateNumberOrRegister() }
    if (is(op, BinaryOps)) return { op, a: this.generateNumberOrRegister(), b: this.generateRegister() }
    if (is(op, Jumps)) return { op, a: this.generateAddress(program) }
  }

  private generateNumberOrRegister(): number | Register {
    if (Math.random() < this.registerProbability)
      return this.generateRegister()
    else
      return this.generateNumber()
  }

  private generateRegister(): Register {
    return _.sample(Registers)
  }

  private generateNumber(): number {
    return _.random(-5, 5, false)
  }

  private generateAddress(program: Line[]): number {
    return _.random(0, program.length - 1, false)
  }

  private addRemoveLine(program: Line[]): Line[] {
      if (Math.random() < 0.5 && program.length > 0)
        program.splice(Math.floor(Math.random() * program.length), 1)
      else if (program === undefined || program.length < this.maxProgramSize)
        program.splice(Math.floor(Math.random() * program.length), 0, this.generateLine(program))
      return program
    }
}

export class GeneticSplicer {
  constructor(readonly mutator: GeneticMutator, readonly spliceBias = 0.2) {  }

  public splice(parent1: Line[], parent2: Line[]): Line[] {
    const child = _.zip(parent1, parent2).map(p => Math.random() < this.spliceBias ? p[0] || p[1] : p[1] || p[0])
    return this.mutator.mutate(child.filter(l => l != undefined)) || []
  }
}
