let isNode = typeof require !== "undefined";

var math;

if (isNode) {
    math = require("mathjs");
}

math.config({
    number: "BigNumber",
    precision: 100
});

/*
directions: ><v^
motions:    udlrc UDLRC
    uU - above
    dD - below
    lL - left
    rR - right
    cC - center
    udlrc - first operand (default: c)
    UDLRC - second operand (default: L)
    $ - swap motions


operators:
[niladic]

[monadic]



[dyadic]

+   addition
-   subtraction
/   division
*   multiplication
%   modulus

loops: [...]
if:    {...}
rep:   (...)N



*/

class Slate {
    constructor() {
        this.data = [[math.bignumber(0)]];
        this.offsetX = 0;
        this.offsetY = 0;
    }

    padTo(width, height) {
        height += this.offsetY;
        width += this.offsetX;
        // append rows to allow invalid upward movement
        while(height < 0) {
            this.data.unshift([]);
            height++;
            this.offsetY++;
        }
        // prepend 0s to allow invalid leftward movement
        while(width < 0) {
            for(let row of this.data) {
                row.unshift(math.bignumber(0));
            }
            width++;
            this.offsetX++;
        }

        while(this.data.length <= height) {
            // add empty row
            this.data.push([]);
        }

        let maxSize = Math.max(width + 1, ...this.data.map(e => e.length));

        for(let row of this.data) {
            while(row.length < maxSize) {
                row.push(math.bignumber(0));
            }
        }
    }

    cellAt(x, y) {
        this.padTo(x, y);

        return this.data[y + this.offsetY][x + this.offsetX];
    }

    setCell(x, y, v) {
        this.padTo(x, y);

        return this.data[y + this.offsetY][x + this.offsetX] = v;
    }

    *[Symbol.iterator]() {
        yield* this.data;
    }
}

class Token {
    constructor(type, raw) {
        this.type = type;
        this.raw = raw;
    }
}
Object.defineProperty(Token, "NUMBER", { value: Symbol("Token.NUMBER") });
Object.defineProperty(Token, "OPERATOR", { value: Symbol("Token.OPERATOR") });
Object.defineProperty(Token, "STRING", { value: Symbol("Token.STRING") });

function* range(min, max=null) {
    if(max === null) {
        yield* range(0, min);
    }
    else {
        for(let i = min; i < max; i++) {
            yield i;
        }
    }
}

function* mapGenerator(gen, func) {
    for(let el of gen) {
        yield func(el);
    }
}

const TOKENIZE_REGEX = /".*"|\)?\d+|./g;
const NUMBER_REGEX = /^\d+$/;
class Simplex {
    static tokenize(code) {
        return code.match(TOKENIZE_REGEX).map(token => {
            if(NUMBER_REGEX.test(token)) {
                return new Token(Token.NUMBER, token);
            }
            else if(token[0] === '"') {
                return new Token(Token.STRING, token);
            }
            else {
                return new Token(Token.OPERATOR, token);
            }
        });
    }

    static truthy(num) {
        return !math.equal(num, 0);
    }

    static falsey(num) {
        return !Simplex.truthy(num);
    }

    constructor(code) {
        this.tokens = Simplex.tokenize(code);
        this.loops = {};

        // handle loops
        let loopStack = [];
        for(let i = 0; i < this.tokens.length; i++) {
            let token = this.tokens[i];
            if(token.raw === "[" || token.raw === "{" || token.raw === "(") {
                loopStack.push(i);
            }
            else if(token.raw === "]" || token.raw === "}" || token.raw[0] === ")") {
                let source = loopStack.pop();
                this.loops[source] = i;
                this.loops[i] = source;
            }
        }

        this.ip = 0;
        this.x = 0;
        this.y = 0;
        this.fuel = Infinity;
        this.slateList = [];
        this.currentSlate = 0;
        this.ensureSlateDefined();
        this.delta = Simplex.directions.right;
        this.motions = [
            Simplex.directions.center,
            Simplex.directions.left,
        ];
        this.loopCounters = [];
    }

    get slate() {
        return this.slateList[this.currentSlate];
    }

    set slate(v) {
        return this.slateList[this.currentSlate] = v;
    }

    ensureSlateDefined() {
        if(!this.slate) {
            this.slate = new Slate();
            this.slate.padTo(this.x, this.y);
        }
    }

    nextSlate() {
        this.currentSlate++;
        this.ensureSlateDefined();
    }

    previousSlate() {
        this.currentSlate--;
        this.ensureSlateDefined();
    }

    jumpToSlate(number) {
        this.currentSlate = number;
        this.ensureSlateDefined();
    }

    // each element in `this.motions` is where each argument is found
    followMotions(count) {
        return [...range(count)].map(n => {
            let motion = this.motions[n];
            return this.cellAt(...motion);
        });
    }

    setCell(v, dx=0, dy=0) {
        return this.slate.setCell(this.x + dx, this.y + dy, v);
    }

    cellAt(dx=0, dy=0) {
        return this.slate.cellAt(this.x + dx, this.y + dy);
    }

    step() {
        let instruction = this.tokens[this.ip];
        let { type, raw } = instruction;

        if(type === Token.NUMBER) {
            this.setCell(math.bignumber(raw));
        }
        else {
            let opName = raw[0];
            // [data] if defined, [] otherwise
            let opData = [raw.slice(1)].filter(e => e);
            let op = Simplex.operators[opName];
            if(op) {
                let arity = op.length;
                let operands = this.followMotions(arity);
                let result = op.bind(this)(...opData, ...operands);
                if(arity && result !== undefined) {
                    this.setCell(result);
                }
            }
            else {
                console.error("Undefined operator " + raw);
            }
        }

        this.ip++;
    }

    run() {
        while(this.ip < this.tokens.length) {
            this.step();
        }
    }

    debug() {
        for(let row of this.slate) {
            let comp = "";
            for(let cell of row) {
                comp += math.round(cell, 15) + " ";
            }
            console.log(comp.trim());
        }
    }

    output(str) {
        str = str.toString();
        if(this.DOMEnabled) {
            this.outputElement.innerHTML += str;
        }
        else if(isNode) {
            process.stdout.write(str);
        }
        else {
            throw new Error("No output connected.");
        }
    }

    // DOM functions
    connect(element) {
        if(element) {
            this.DOMEnabled = true;
            this.outputElement = element;
        }
        else {
            throw new Error("Invalid/no element passed.");
        }
    }
}

Simplex.directions = {
    left:   [-1, 0],
    right:  [1, 0],
    up:     [0, -1],
    down:   [0, 1],
    center: [0, 0],
};
Simplex.operators = {
    // move left/right/up/down
    ">": function() {
        if(this.fuel > 0) {
            this.x++;
        }
        this.cellAt();
        this.fuel--;
    },
    "<": function() {
        if(this.fuel > 0) {
            this.x--;
        }
        this.cellAt();
        this.fuel--;
    },
    "^": function() {
        if(this.fuel > 0) {
            this.y--;
        }
        this.cellAt();
        this.fuel--;
    },
    "v": function() {
        if(this.fuel > 0) {
            this.y++;
        }
        this.cellAt();
        this.fuel--;
    },

    // motions
    // crlud = set first param
    // CRLUD = set second param
    "c": function() {
        this.motions[0] = Simplex.directions.center;
    },
    "r": function() {
        this.motions[0] = Simplex.directions.right;
    },
    "l": function() {
        this.motions[0] = Simplex.directions.left;
    },
    "u": function() {
        this.motions[0] = Simplex.directions.up;
    },
    "d": function() {
        this.motions[0] = Simplex.directions.down;
    },
    "C": function() {
        this.motions[1] = Simplex.directions.center;
    },
    "R": function() {
        this.motions[1] = Simplex.directions.right;
    },
    "L": function() {
        this.motions[1] = Simplex.directions.left;
    },
    "U": function() {
        this.motions[1] = Simplex.directions.up;
    },
    "D": function() {
        this.motions[1] = Simplex.directions.down;
    },
    // cycle through slates

    // move according to delta
    "#": function() {
        if(this.fuel > 0) {
            this.x += this.delta[0];
            this.y += this.delta[1];
        }
        this.cellAt();
        this.fuel--;
    },
    // left turn, relative
    "~": function() {
        this.delta = math.multiply(this.delta, [[0, -1], [1, 0]]);
    },
    // right turn, relative
    "`": function() {
        this.delta = math.multiply(this.delta, [[0, 1], [-1, 0]]);
    },

    // reverse arguments
    "$": function() {
        this.motions.reverse();
    },

    // usual mathematic operators
    "/": function(x, y) {
        return math.divide(x, y);
    },
    "+": function(x, y) {
        return math.add(x, y);
    },
    "-": function(x, y) {
        return math.subtract(x, y);
    },
    "*": function(x, y) {
        return math.multiply(x, y);
    },

    // copy second argument
    ":": function(x, y) {
        return y;
    },

    // remove bounds depending on the first motion
    "k": function() {
        if(this.motions[0] === Simplex.directions.up) {
            this.slate.data.shift();
            this.slate.offsetY--;
        }
        else if(this.motions[0] === Simplex.directions.left) {
            this.slate.data.forEach(row => row.shift());
            this.slate.offsetX--;
        }
        else if(this.motions[0] === Simplex.directions.right) {
            this.slate.data.forEach(row => row.pop());
        }
        else if(this.motions[0] === Simplex.directions.down) {
            this.slate.data.pop();
        }
    },
    // reset to origin, resets offsets as well
    ";": function() {
        this.slate.offsetX = this.slate.offsetY = this.x = this.y = 0;
    },

    // xyXY - get / set x/y
    "x": function () {
        return math.bignumber(this.x);
    },
    "y": function () {
        return math.bignumber(this.y);
    },
    "X": function (newX) {
        this.x = math.number(newX);
    },
    "Y": function (newY) {
        this.y = math.number(newX);
    },

    // slate travel
    // go up a slate
    "'": function () {
        this.previousSlate();
    },
    // go down a slate
    ".": function () {
        this.nextSlate();
    },

    "G": function () {
        this.debug();
    },
    "o": function () {
        this.output(this.cellAt().toString());
    },
    "c": function () {
        this.output(String.fromCharCode(this.cellAt().toString()));
    },

    "q": function(n) {
        return math.subtract(n, 1);
    },
    "p": function(n) {
        return math.add(n, 1);
    },
    "_": function(n) {
        return math.subtract(0, n);
    },
    "i": function() {
        this.setCell(Infinity);
    },

    "(": function() {
        let otherBraceLocation = this.loops[this.ip];
        let otherBrace = this.tokens[otherBraceLocation];
        let count = math.bignumber(otherBrace.raw.slice(1) || "1");

        if(math.equal(count, 0)) {
            this.ip = otherBraceLocation + 1;
        }
        else {
            this.loopCounters.push(count);
        }
    },
    ")": function() {
        let otherBraceLocation = this.loops[this.ip];
        // let destination = otherBraceLocation + 1;

        let counter = this.loopCounters[this.loopCounters.length - 1];
        counter--;

        if(math.equal(counter, 0)) {
            return;
        }
        else {
            this.loopCounters[this.loopCounters.length - 1] = counter;
            this.ip = otherBraceLocation;
        }
    },

    "[": function() {
        if(this.fuel <= 0 || Simplex.falsey(this.cellAt())) {
            this.ip = this.loops[this.ip];
        }
    },
    "]": function() {
        if(this.fuel > 0 && Simplex.truthy(this.cellAt())) {
            this.ip = this.loops[this.ip];
        }
    },

    // what the flippity flip is fuel?!
    "f": function(fuel) {
        this.fuel = fuel;
    },
};

if(isNode) {
    if(process.argv.length < 3) {
        console.error("Insufficient arguments.");
    }
    else {
        let inst = new Simplex(process.argv[2]);
        inst.run();
    }
    // inst.debug();
}
