import { Line, Register, Ops, Registers, is, SingletonOps, UnaryOps, BinaryOps, Jumps } from './language'
import * as _ from 'lodash'
import { ComputingUnit } from './unit';

export class GeneticMutator {
  private mutateProbability
  private changeOpProbability
  private registerProbability

  constructor(mutateProbability = 0.9, changeOpProbability = 0.5, registerProbability = 0.3) {
    this.mutateProbability = mutateProbability
    this.changeOpProbability = changeOpProbability
    this.registerProbability = registerProbability
  }

  public mutate(program: Line[], mutations: number = 1): Line[] {
    let copy = program != undefined ? _.clone(program) : []
    for (let m = 0; m < mutations; m++)
      copy = this.mutateOne(copy)
    return copy.length > 0 ? copy : undefined
  }

  private mutateOne(program: Line[]): Line[] {
    if (program.length > 0 && Math.random() < this.mutateProbability)
      return this.mutateExisting(program)
    else
      return this.addRemoveLine(program)
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

  private generateLine(program: Line[]): Line {
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
    if (program.length > 0 && Math.random() < 0.5 || program.length == 15)
      program.splice(Math.floor(Math.random() * program.length), 1)
    else
      program.splice(Math.floor(Math.random() * program.length), 0, this.generateLine(program))
    return program
  }
}

export class GeneticSplicer {
  mutator: GeneticMutator;

  constructor(mutator: GeneticMutator) {
    this.mutator = mutator;    
  }

  public splice(individual1: ComputingUnit[][], individual2: ComputingUnit[][]) {
    let copy = _.clone(individual1)
    for (let r = 0; r < individual1.length; r++) {
      for (let c = 0; c < individual1[r].length; c++) {
        if (Math.random() < 0.5)
          copy[r][c].program = this.mutator.mutate(individual1[r][c].program)
        else
          copy[r][c].program = this.mutator.mutate(individual2[r][c].program)
      }
    }
    return copy
  }  
}
