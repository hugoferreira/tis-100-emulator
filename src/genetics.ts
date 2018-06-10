import { Line, Register, Ops, SingletonOps, BinaryOps, UnaryOps, Jumps, Registers, SingletonOp, UnaryOp, BinaryOp, Jump } from './language'
import { setInterval } from 'timers';
import * as _ from 'lodash'
import { line, program } from 'blessed';

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
    if (line.op in SingletonOps || Math.random() < this.changeOpProbability)
      return this.mutateOp(program, line)
    else
      return this.mutateParams(program, line)
  }

  private mutateOp(program: Line[], line): Line {
    return this.generateLine(program)
  }

  private mutateParams(program: Line[], line: Line): Line {
    switch (line.op) {
      case 'ADD':
      case 'SUB':
        return { type: 'Unr', op: line.op as UnaryOp, a: this.generateNumberOrRegister() }
      case 'MOV':
        return { type: 'Bin', op: line.op as BinaryOp, a: this.generateNumberOrRegister(), b: this.generateRegister() }
      case 'JRO':
      case 'JEZ':
      case 'JNZ':
      case 'JLZ':
      case 'JGZ':
      case 'JMP':      
        return { type: 'Jmp', op: line.op as Jump, a: this.generateAddress(program) }
    }
  }

  private generateLine(program: Line[]): Line {
    let op = Ops[Math.floor(Math.random() * Ops.length)]
    switch (op) {
      case 'NOP':
      case 'NEG':
      case 'SAV':
      case 'SWP':
        return { type: 'Sng', op: op as SingletonOp }
      case 'ADD':
      case 'SUB':
        return { type: 'Unr', op: op as UnaryOp, a: this.generateNumberOrRegister() }
      case 'MOV':
        return { type: 'Bin', op: op as BinaryOp, a: this.generateNumberOrRegister(), b: this.generateRegister() }
      case 'JRO':
      case 'JEZ':
      case 'JNZ':
      case 'JLZ':
      case 'JGZ':
      case 'JMP':      
        return { type: 'Jmp', op: op as Jump, a: this.generateAddress(program) }
    }
  }

  private generateNumberOrRegister(): number | Register {
    if (Math.random() < this.registerProbability)
      return this.generateRegister()
    else
      return this.generateNumber()
  } 

  private generateRegister(): Register {
    return Registers[Math.floor(Math.random() * Registers.length)]
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