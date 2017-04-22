// sets up server and has it listen
var express = require(`express`);
var app = express();
var serv = require(`http`).Server(app);
var counter = 0;

app.get(`/`, function(req, res) {
    if(counter == 0){
        res.sendFile(`${__dirname}/controls/defender.html`);
    }else if(counter == 1){
        res.sendFile(`${__dirname}/controls/attacker.html`);
    }else{
        res.sendFile(`${__dirname}/presenter.html`);
    }
});
app.use(`/controls`, express.static(`${__dirname}/controls`));
app.use(`/assets`, express.static(`${__dirname}/assets`));

serv.listen(process.env.PORT || 2000, function(){
    console.log(`Server started.`);
});

var SOCKET_LIST = [];
var io = require(`socket.io`)(serv);

io.on(`connection`, function (socket) {
    console.log(counter);
    if(counter < 2){
        socket.id = counter;
        counter += 1;
        SOCKET_LIST[socket.id] = socket;
        Player.onConnect(socket);
    }
    socket.on(`left-pressed`, function(type, isDown){
        if(type === `defender`){
            defender.leftPressed = isDown; 
        } else if(type === `attacker`){
            attacker.leftPressed = isDown;
        }
    });
    socket.on(`right-pressed`, function(type, isDown){
        if(type === `defender`){
            defender.rightPressed = isDown; 
        } else if(type === `attacker`){
            attacker.rightPressed = isDown;
        }
    });
    socket.on(`shoot`, function(){
        Bullet(defender.x);
    });
    socket.on(`attack`, function(){
    	Trash(attacker.x);
    });
    socket.on(`plant`, function(){
        Tree(defender.x);
    });
});

var framerate = 1000 / 40;
var newEntities = false;
var time;

var defender = null;
function Defender(){
    this.x = 0.5;
    this.speed = 0.01;
    
    this.update = function(){
        if(this.leftPressed && this.x > 0.05){
            this.x -= this.speed;
        }
        if(this.rightPressed && this.x < 0.95){
            this.x += this.speed;
        }
        return this.getUpdatePack();
    }
    this.getUpdatePack = function(){
        return {x: this.x,};
    }
    this.getInitPack = function(){
        return {x: this.x,};
    }
    
    defender = this;
    initPack.defender = this.getInitPack();
}
Defender.update = function(){
    if(defender !== null){
        return defender.update();
    }
}

var attacker = null;
function Attacker(){
    this.x = 0.5;
    this.speed = 0.01;
    
    this.update = function(){
        if(this.leftPressed && this.x > 0.05){
            this.x -= this.speed;
        }
        if(this.rightPressed && this.x < 0.95){
            this.x += this.speed;
        }
        
        return this.getUpdatePack();
    }
    this.getUpdatePack = function(){
        return {x: this.x,};
    }
    this.getInitPack = function(){
        return {x: this.x,};
    }
    
    attacker = this;
    initPack.attacker = this.getInitPack();
}
Attacker.update = function(){
    if(attacker !== null){
        return attacker.update();
    }
}

var earth = null;
function Earth(){
	this.x = 0.5;
	this.y = 1.3;
	this.radius = 0.5;
	this.health = 100;
	
	this.hit = function(){
		this.health -= 5;
	}
	this.update = function(){
		return this.getUpdatePack();
	}
	this.getUpdatePack = function(){
        return {health: this.health,};
    }
	
	earth = this;
	initPack.earth = this.getInitPack();
}

var Player = {};
Player.onConnect = function (socket) {
    if(socket.id == 0){
       new Defender(); 
    }else if(socket.id == 1){
        new Attacker();
    }
};

function Bullet(x){
    this.id = Math.random();
    this.speed = -0.01;
    this.x = x;
    this.y = 1;
    
    this.updatePosition = function(){
        if(!this.checkForCollision()){
            this.y -= this.speed;
        }
        // if has been deleted
        if(!Trash.list.hasOwnProperty(this.id)){
           removePack.bullet.push(this.id);
        }
    };
    
    this.checkForCollision = function(){
        // if goes off screen
        if(this.y <= 0){
            delete Bullet.list[this.id];
            return true;
        }
        
        for(var i in Trash.list){
            var t = Trash.list[i];
            var distance = Math.sqrt((Math.pow((t.x - this.x), 2) + Math.pow(t.y - this.y, 2)));
            if(distance <= 15){
                delete Bullet.list[this.id];
                delete Trash.list[t.id];
                return true;
            }
        }
        return false;
    };
    
    this.update = function(){
       return this.getUpdatePack(); 
    };

    this.getUpdatePack = function(){
        return {
            x: this.x,
            y: this.y,
        };
    };
    
    this.getInitPack = function(){
        return {
            id: this.id,
            x: this.x,
            y: this.y,
        };
    };
    
    initPack.bullets.push(this.getInitPack);
}
Bullet.update = function(){
    var bullets = [];
    for(var b in Bullet.list){
        bullets.push(b.update());
    }
    return bullets;
};
Bullet.list = {};

function Trash(x){
	this.id = Math.random();
	this.speed = 0.01;
	this.x = x;
	this.y = 0;
	
    this.update = function(){
    	this.y += this.speed;
    	this.earthCollision();
    	this.treeCollision();
    	this.clipOffscreen();
    	return this.getUpdatePack(); 
    }
    this.getUpdatePack = function(){
        return {};
    }
    this.earthCollision = function(){
    	var dist = Math.sqrt((earth.y - this.y) * (earth.y - this.y) + (earth.x - this.x) + (earth.x - this.x));
    	if(dist < earth.radius) {
    		delete Trash.list[this.id];
    		earth.hit();
    	}
    }
    this.treeCollision = function(){
    	for(var i in Tree.list){
            var t = Tree.list[i];
            var distance = Math.sqrt((Math.pow((t.x - this.x), 2) + Math.pow(t.y - this.y, 2)));
            if(distance <= t.radius){
                t.hit();
                delete Trash.list[t.id];
                return true;
            }
        }
    }
    this.clipOffscreen = function() {
    	if(this.x < 0 || this.x > 1 || this.y < 0 || this.y > 1)
    		delete Trash.list[this.id];
    }

    Trash.list[this.id] = this;
}
Trash.update = function(){
    var trash = [];
    for(var t in Trash.list){
        trash.push(t.update());
    }
    return trash;
}
Trash.list = {};


function Tree(x){
	this.id = Math.random();
	this.x = x;
	this.y = 0;
	this.health = 100;
	this.radius = 0.1;
	
	this.hit = function(){
		this.health -= 40;
	}
    this.update = function(){
    	if(ithis.health <= 0)
    		delete Tree.list[this.id];
    	return this.getUpdatePack(); 
    }
    this.getUpdatePack = function(){
        return {};
    }
    Tree.list[this.id] = this;
}
Tree.update = function(){
    for(var t in Trash.list){
        t.update();
    }
}
Tree.list = {};


function gameTimer() {
    time += 1 / framerate;
}

var initPack = {
    attacker: null,
    defender: null,
    earth: null,
    bullets: [],
    trash: [],
    trees: []
};

var removePack = {
    bullets: [],
    trash: [],
    trees: []
};

setInterval(function () {
    gameTimer();

    var pack = {
        defender: Defender.update(),
        attacker: Attacker.update(),
        bullet: Bullet.update(),
        trash: Trash.update(),
    };
    
    io.emit(`init`, initPack);
    io.emit(`update`, pack);
    io.emit(`remove`, removePack);
    
    
    initPack = {
        attacker: null,
        defender: null,
        earth: null,
        bullets: [],
        trash: [],
    };

    removePack = {
        bullets: [],
        trash: [],
        trees: []
    };

}, 1000 / framerate);
