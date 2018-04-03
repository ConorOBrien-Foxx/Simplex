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
    }
    
    pad(x, y) {
        while(this.data.length < y) {
            this.data.push([]);
        }
        
        while(this.data[y].length < x) {
            this.data[y].push(math.bignumber(0));
        }
    }
    
    get(x, y) {
        this.pad(x, y);
        
        return this.data[y][x];
    }
    
    set(x, y, v) {
        this.pad(x, y);
        
        return this.data[y][x] = v;
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

Object.defineProperty(Token, "NUMBER", { value: Symbol("Token.NUMBER") });
Object.defineProperty(Token, "OPERATOR", { value: Symbol("Token.OPERATOR") });

class Simplex {
    static tokenize(code) {
        return code.match(/\d+|./g).map(e => {
            if(+e == e) {
                return new Token(Token.NUMBER, e);
            }
            else {
                return new Token(Token.OPERATOR, e);
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
            if(token.raw === "[" || token.raw === "{") {
                loopStack.push(i);
            }
            else if(token.raw === "]" || token.raw === "}") {
                let source = loopStack.pop();
                this.loops[source] = i;
                this.loops[i] = source;
            }
        }
        
        this.ip = 0;
        this.x = 0;
        this.y = 0;
        this.fuel = Infinity;
        this.slate = new Slate();
        this.delta = Simplex.directions.right;
        this.motions = [
            Simplex.directions.center,
            Simplex.directions.left,
        ];
    }
    
    getOperands(count) {
        return [...range(count)].map(n => {
            let motion = this.motions[n];
            return this.get(...motion);
        });
    }
    
    set(v, dx=0, dy=0) {
        return this.slate.set(this.x + dx, this.y + dy, v);
    }
    
    get(dx=0, dy=0) {
        return this.slate.get(this.x + dx, this.y + dy);
    }
    
    step() {
        let instruction = this.tokens[this.ip];
        let type = instruction.type;
        let raw = instruction.raw;
        
        if(type === Token.NUMBER) {
            this.set(math.bignumber(raw));
        }
        else {
            let op = Simplex.operators[raw];
            if(op) {
                let arity = op.length;
                let operands = this.getOperands(arity);
                let result = op.bind(this)(...operands);
                if(arity && result !== undefined) {
                    this.set(result);
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
}

Simplex.directions = {
    left:   [-1, 0],
    right:  [1, 0],
    up:     [0, -1],
    down:   [0, 1],
    center: [0, 0],
};
Simplex.operators = {
    ">": function() {
        if(this.fuel > 0) {
            this.x++;
        }
        this.fuel--;
    },
    "<": function() {
        if(this.fuel > 0) {
            this.x--;
        }
        this.fuel--;
    },
    "^": function() {
        if(this.fuel > 0) {
            this.y--;
        }
        this.fuel--;
    },
    "v": function() {
        if(this.fuel > 0) {
            this.y++;
        }
        this.fuel--;
    },
    "#": function() {
        if(this.fuel > 0) {
            this.x += this.delta[0];
            this.y += this.delta[1];
        }
        this.fuel--;
    },
    // left turn, relative
    "~": function() {
        
    },
    "$": function() {
        this.motions.reverse();
    },
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
        this.set(Infinity);
    },
    
    "[": function() {
        if(this.fuel <= 0 || Simplex.falsey(this.get())) {
            this.ip = this.loops[this.ip];
        }
    },
    "]": function() {
        if(this.fuel > 0 && Simplex.truthy(this.get())) {
            this.ip = this.loops[this.ip];
        }
    },
    
    "f": function(fuel) {
        this.fuel = fuel;
    },
};

let inst = new Simplex(process.argv[2]);

inst.run();

inst.debug();