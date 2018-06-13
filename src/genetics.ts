import { Line, Register, Ops, Registers, is, SingletonOps, UnaryOps, BinaryOps, Jumps, Decompile } from './language'
import * as _ from 'lodash'
import { ComputingUnit } from './unit';

export class GeneticMutator {
  constructor(readonly mutations = 1,
              readonly mutateProbability = 0.9,
              readonly changeOpProbability = 0.5,
              readonly registerProbability = 0.7,
              readonly alterlinesProbability = 0.1,
              readonly maxProgramSize = 10) { }

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

  public generateLine(program: Line[]): Line {
    let op = _.sample(Ops)
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
    return Math.floor(Math.random() * 20 - 10)
  }

  private generateAddress(program: Line[]): number {
    return Math.floor(Math.random() * program.length)
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
