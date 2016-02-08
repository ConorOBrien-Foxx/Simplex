math.config({number:"bignumber",precision:100});

// "Memory Grid"
function Slate(){
    this.grid = [[math.bignumber(0)]];
}

Slate.prototype.get = function(row,column){
    while(row>=this.grid.length)
        this.grid.push([math.bignumber(0)]);
    while(column>=this.grid[row].length)
        this.grid[row].push(math.bignumber(0));
    return this.grid[row][column];
}

Slate.prototype.set = function(value,row,column){
    this.get(row,column);
    this.grid[row][column] = typeof value==="object"?value:math.eval(value);
}

Slate.prototype.view = function(){
    return JSON.stringify(this.grid.map(function(x){return x.map(function(r){return +r.valueOf()})})).replace(/],/g,"],\n");
}

function parseBignumber(n){
    return +n;
}

function Simplex(code,skin){
    this.slate = new Slate();
    this.tape = 0;
    this.cell = 0;
    this.index = 0;
    this.code = code;
    this.mode = "DEFAULT";
    this.skin = skin || Simplex.skins.classic;
    this.inputFunc = alert;
    this.outputFunc = prompt;
    if(this.skin.init) this.skin.init(this);
}

Simplex.prototype.connect = function(codeElement,inputElement){
    if(typeof codeElement!=="undefined"&&codeElement){
        this.outputFunc = function(value){
            codeElement.innerHTML += value;
        }
    }
    if(typeof inputElement!=="undefined"&&inputElement){
        this.inputFunc = function(){
            return iConnected.value;
        }
    }
}

Simplex.prototype.execCmd = function(command){
    if(this.skin[command]) return this.skin[command](this);
    else return null;
}

Simplex.prototype.finish = function(){
    console.log("PROGRAM FINISHED EXECUTING.");
    if(this.skin.codeEnd) this.skin.codeEnd(this);
}

Simplex.prototype.step = function(){
    this.skin.modes[this.mode](this);
    this.index++;
    console.log(this.slate.view());
}

Simplex.prototype.run = function(){
    while(this.index<this.code.length){
        this.step();
    }
    this.finish();
}

Simplex.prototype.full = function(){
    function full(instance){
        if(instance.index<=instance.code.length){
            instance.step();
            setTimeout(full,1,instance);
        } else instance.finish();
    }
    full(this);
}

Simplex.modes = {};
Simplex.modes.DEFAULT = function(S){
    S.execCmd(S.code[S.index]);
}

Simplex.skins = {};
Simplex.skins.classic = {
    // header stuff
    "NAME": "classic",
    "init": function(S){
        S.outted = false;
        S.code = S.code.replace(/\((.+?)\)(\d+)/g,function(a,b,c){
            return b.repeat(+c||1);
        });
    },
    "modes": {
        "DEFAULT": Simplex.modes.DEFAULT,
        "STRING": function(S){
            do {
                console.log(S.code[S.index]);
                if(S.code[S.index]=="\\")S.index++;
                else {
                    S.slate.set(S.code[S.index].charCodeAt(),S.tape,S.cell++);
                }
            } while(S.code[++S.index]!="\""&&S.index<S.code.length);
            S.mode = "DEFAULT";
        }
    },
    "stepEnd": function(){},
    "codeEnd": function(S){
        if(!S.outted) S.outputFunc(S.slate.get(S.tape,S.cell));
    },
    // functions
    "R": function(S){
        S.cell++;
    },
    "i": function(S){
        S.slate.set(math.bignumber(+S.inputFunc()),S.tape,S.cell)
    },
    "j": function(S){
        S.slate.grid[S.tape] = S.slate.grid[S.tape].splice(S.cell,0,math.bignumber(0));
    },
    "X": function(S){
        S.slate.set(math.randomInt(1+S.slate.get(S.tape,S.cell)),S.tape,S.cell);
    },
    "p": function(S){
        S.slate.grid[S.tape].splice(S.cell,1);
    },
    "g": function(S){
        S.slate.grid[S.tape].splice(0,S.slate.grid[S.tape].length).forEach(function(x){
            S.outputFunc(String.fromCharCode(parseBignumber(x)));
        });
        S.slate.grid[S.tape] = [math.bignumber(0)];
        S.outted = true;
    },
    "¦": function(S){
        if(!+S.slate.get(S.tape,S.cell)) S.index++;
        else {
            S.execCmd(S.code[++S.index]);
            S.index -= 2;
        }
    },
    "L": function(S){
        S.cell--;
    },
    "U": function(S){
        S.tape++;
    },
    "D": function(S){
        S.tape--;
    },
    "I": function(S){
        S.slate.set(math.add(S.slate.get(S.tape,S.cell),1),S.tape,S.cell);
    },
    "d": function(S){
        S.slate.set(math.subtract(S.slate.get(S.tape,S.cell),1),S.tape,S.cell);
    },
    "o": function(S){
        S.outputFunc(S.slate.get(S.tape,S.cell));
        S.outted = true;
    },
    "\"": function(S){
        S.mode = "STRING";
    },
    "0": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(0),S.tape,S.cell);
	},
	"1": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(1),S.tape,S.cell);
	},
	"2": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(2),S.tape,S.cell);
	},
	"3": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(3),S.tape,S.cell);
	},
	"4": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(4),S.tape,S.cell);
	},
	"5": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(5),S.tape,S.cell);
	},
	"6": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(6),S.tape,S.cell);
	},
	"7": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(7),S.tape,S.cell);
	},
	"8": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(8),S.tape,S.cell);
	},
	"9": function(S){
		S.slate.set(math.chain(S.slate.get(S.tape,S.cell)).multiply(10).add(9),S.tape,S.cell);
	},
}
Simplex.skins.BFDeriv = {

}

var s = new Simplex("IIIRIIoLo");

/*function SimplexNumber(a,b,c){
    this.re = a;
    this.im = b;
    this.base = c || 10;
}

/*
 * SimplexNumber#parse
 * Accepts a string as an argument in the form of
 *     A +/- Bi [{C}]
 * or, as a regex,
 *     \w+\s*[+-]\w*i\s*({\d+})
 * and returns an instance of SimplexNumber
 * /
SimplexNumber.parse = function(str){
    var base = +str.indexOf("{")>=0?str.slice(str.indexOf("{")+1,str.length-1):10;
    var real = parseInt(str.slice(0,str.indexOf("+")),base);
    var imag = parseInt(str.slice(str.indexOf("+")+1,str.indexOf("i")),base);
    return new SimplexNumber(real,imag,base);
}*/
