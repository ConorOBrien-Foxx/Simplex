math.config({number:"bignumber",precision:100});

// "Memory Grid"
function Slate(){
    this.grid = [[math.bignumber(0)]];
}

Slate.prototype.get = function(row,column){
    console.log(row,column)
    while(row>=this.grid.length)
        this.grid.push([math.bignumber(0)]);
    while(column>=this.grid[row].length)
        this.grid[row].push(math.bignumber(0));
    return this.grid[row][column];
}

Slate.prototype.set = function(value,row,column){
    console.log(3)
    this.get(row,column);
    this.grid[row][column] = typeof value==="object"?value:math.eval(value);
}

Slate.prototype.view = function(){
    return JSON.stringify(this.grid.map(function(x){return x.map(function(r){return +r.valueOf()})})).replace(/],/g,"],\n");
}

var test = new Slate();

function Simplex(code,skin){
    this.slate = new Slate();
    this.tape = 0;
    this.cell = 0;
    this.index = 0;
    this.code = code;
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
    this.execCmd(this.code[this.index]);
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

Simplex.skins = {};
Simplex.skins.classic = {
    // header stuff
    "NAME": "classic",
    "init": function(S){
        S.outted = false;
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
        S.slate.set(math.bignumber(+prompt()),S.tape,S.cell)
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
    }
}
Simplex.skins.BFDeriv = {

}

var s = new Simplex("IIIRIIoLo");
