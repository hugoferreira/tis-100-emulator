"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AsyncQueue_1 = require("./lib/AsyncQueue");
const consoleui_1 = require("./consoleui");
const unit_1 = require("./unit");
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
    [new unit_1.Unit('U1', p2, undefined, u1u2), new unit_1.Unit('U2', p3, u1u2, u2u3), new unit_1.Unit('U3', '', u2u3, u3u4), new unit_1.Unit('U4', '', u3u4, undefined)],
    [undefined, undefined, undefined, undefined],
    [undefined, undefined, undefined, undefined]
];
const gui = new consoleui_1.UserInterface(unitsArray);
gui.run();
//# sourceMappingURL=main.js.map