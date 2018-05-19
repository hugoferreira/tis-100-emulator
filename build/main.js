"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const P = require("parsimmon");
const AsyncQueue_1 = require("./AsyncQueue");
const Blessed = require("blessed");
const _ = require("lodash");
const BinaryOps = ['MOV'];
const UnaryOps = ['ADD', 'SUB', 'JRO'];
const LabeledJumps = ['JEZ', 'JNZ', 'JLZ', 'JGZ'];
const SingletonOps = ['NOP', 'NEG', 'SAV', 'SWP'];
const Registers = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'ACC', 'NIL'];
const Ops = Array.prototype.concat(BinaryOps, UnaryOps, SingletonOps);
const Lang = P.createLanguage({
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
});
class Unit {
    constructor(id, source, left, right, up, down) {
        this.id = id;
        this.source = source;
        this.left = left;
        this.right = right;
        this.up = up;
        this.down = down;
        this.ip = 0;
        this.nextIp = 0;
        this.acc = 0;
        this.bak = 0;
        this.status = 'IDLE';
        try {
            this.program = Lang.Program.tryParse(source.trim().toUpperCase());
        }
        catch (_a) {
            this.program = undefined;
        }
    }
    async read(r) {
        this.status = 'READ';
        switch (r) {
            case 'ACC': return this.acc;
            case 'LEFT': return this.left.dequeue();
            default: return r;
        }
    }
    async write(r, v) {
        this.status = 'WRTE';
        switch (r) {
            case 'ACC':
                this.acc = v;
                break;
            case 'RIGHT':
                this.right.enqueue(v);
                break;
        }
    }
    async step() {
        if (this.program !== undefined) {
            this.ip = this.nextIp;
            const exp = this.program[this.ip];
            switch (exp.op) {
                case 'MOV':
                    await this.write(exp.b, await this.read(exp.a));
                    break;
                case 'ADD':
                    this.acc += await this.read(exp.a);
                    break;
                case 'SUB':
                    this.acc -= await this.read(exp.a);
                    break;
                case 'SAV':
                    this.bak = this.acc;
                    break;
                case 'SWP':
                    const tmp = this.bak;
                    this.bak = this.acc, this.acc = tmp;
                    break;
            }
            this.nextIp = (this.ip + 1) % this.program.length;
            this.status = 'RUN';
        }
    }
    toString() {
        return `[${this.id}: ${this.status}]  ip: ${this.ip}  acc: ${this.acc}  bak: ${this.bak}`;
    }
    prettyPrint() {
        return this.source.trim().split('\n').map((l, i) => (i == this.ip) ? `{#00ffff-fg}${l}{/}` : l).join('\n');
    }
    peekLeft() {
        if (this.left !== undefined) {
            const r = this.left.last;
            return (r !== undefined) ? r.toString() : '?';
        }
        return '?';
    }
    peekRight() {
        if (this.right !== undefined) {
            const r = this.right.last;
            return (r !== undefined) ? r.toString() : '?';
        }
        return '?';
    }
}
class UserInterface {
    constructor(unitsArray) {
        this.unitsArray = unitsArray;
        this.screen = Blessed.screen({
            smartCSR: true,
            useBCE: true,
            cursor: {
                artificial: true,
                blink: true,
                shape: 'underline',
                color: 'white'
            },
            debug: true,
            dockBorders: true
        });
        this.screen.title = 'TIS100 Emulator';
        this.screen.key(['q', 'C-c'], (ch, key) => process.exit(0));
        const textAreaStyle = {
            tags: true,
            height: 8, width: 23,
            padding: { left: 1 },
            style: {
                fg: '#787878',
                bg: '#454545'
            }
        };
        const infoStyle = Object.assign({}, textAreaStyle, { right: 0, height: 2, width: 7, padding: { left: 0, right: 0 }, align: 'center', style: { bg: '#353535' } });
        const arrowStyle = {
            tags: true, right: 0, height: 2, width: 3,
            align: 'center'
        };
        this.updates = unitsArray.map((r, row) => r.map((unit, col) => {
            const left = 5 + col * 30;
            const top = 2 + row * 11;
            const box = Blessed.box(Object.assign({}, textAreaStyle, { top, left }));
            const acc = Blessed.box(Object.assign({}, infoStyle, { top: 0 }));
            const bak = Blessed.box(Object.assign({}, infoStyle, { top: 2 }));
            const mode = Blessed.box(Object.assign({}, infoStyle, { top: 4 }));
            box.append(acc);
            box.append(bak);
            box.append(mode);
            this.screen.append(box);
            let toRight;
            let fromRight;
            if (col !== r.length - 1) {
                toRight = Blessed.box(Object.assign({}, arrowStyle, { top: (top + 6), left: (left + 25) }));
                fromRight = Blessed.box(Object.assign({}, arrowStyle, { top, left: (left + 25) }));
                this.screen.append(toRight);
                this.screen.append(fromRight);
            }
            return (() => {
                if (unit != undefined) {
                    box.setContent(unit.prettyPrint());
                    acc.setContent(`{#787878-fg}ACC{/}\n${unit.acc.toString()}`);
                    bak.setContent(`{#787878-fg}BAK{/}\n(${unit.acc.toString()})`);
                    mode.setContent(`{#787878-fg}MODE{/}\n${unit.status.toString()}`);
                    if (col !== r.length - 1) {
                        toRight.setContent(`${unit.peekRight()}\n{#787878-fg}==>{/}`);
                        fromRight.setContent(`{#787878-fg}<=={/}\n${0}`);
                    }
                }
            });
        }));
        this.screen.render();
    }
    async step() {
        const units = _.flatten(this.unitsArray).filter(u => u !== undefined);
        this.screen.debug(units.map(u => u.toString()).join('\n'));
        await Promise.race(units.map(u => u.step()));
        _.flatten(this.updates).forEach(g => g());
        this.screen.render();
    }
    run() {
        this.interval = setInterval(((self) => () => self.step())(this), 1000);
    }
}
const p2 = `mov 5, acc
add acc
sub acc
add 20
mov acc, right`;
const p3 = `sub left
add 10
swp`;
const u1u2 = new AsyncQueue_1.AsyncQueue(1);
const u2u3 = new AsyncQueue_1.AsyncQueue(1);
const u3u4 = new AsyncQueue_1.AsyncQueue(1);
const unitsArray = [
    [new Unit('U1', p2, undefined, u1u2), new Unit('U2', p3, u1u2, u2u3), new Unit('U3', '', u2u3, u3u4), new Unit('U4', '', u3u4, undefined)],
    [undefined, undefined, undefined, undefined],
    [undefined, undefined, undefined, undefined]
];
const gui = new UserInterface(unitsArray);
gui.run();
//# sourceMappingURL=main.js.map