import { Line, Register, Ops, Registers, isUnary, isSingle, isBinary, isJump } from './language'
import * as _ from 'lodash'

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
    let copy = _.clone(program)
    for (let m = 0; m < mutations; m++)
      copy = this.mutateOne(copy)
    return copy
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
    if (isSingle(line.op) || Math.random() < this.changeOpProbability)
      return this.mutateOp(program, line)
    else
      return this.mutateParams(program, line)
  }

  private mutateOp(program: Line[], line): Line {
    return this.generateLine(program)
  }

  private mutateParams(program: Line[], line: Line): Line {
    if (isUnary(line.op)) return { op: line.op, a: this.generateNumberOrRegister() }
    if (isBinary(line.op)) return { op: line.op, a: this.generateNumberOrRegister(), b: this.generateRegister() }
    if (isJump(line.op)) return { op: line.op, a: this.generateAddress(program) }
  }

  private generateLine(program: Line[]): Line {
    let op = _.sample(Ops)
    if (isSingle(op)) return { op }
    if (isUnary(op)) return { op, a: this.generateNumberOrRegister() }
    if (isUnary(op)) return { op, a: this.generateNumberOrRegister(), b: this.generateRegister() }
    if (isJump(op)) return { op, a: this.generateAddress(program) }
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