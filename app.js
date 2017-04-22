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
        res.sendFile(`${__dirname}/leaderboard.html`);
    }
});
app.use(`/controls`, express.static(`${__dirname}/controls`));

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
    	Trash(defender.x);
    });
    socket.on(`plant`, function(){
        
    });
});

var framerate = 1000 / 40;
var newEntities = false;
var time;

var screenWidth = 500;
var screenHeight = 270;

var defender = null;
function Defender(){
    this.x = 80;
    this.speed = 0.5;
    
    this.update = function(){
        if(this.leftPressed){
            this.x -= speed;
        }
        if(this.rightPressed){
            this.x += speed;
        }
        
        return this.getUpdatePack();
    }
    this.getUpdatePack = function(){
        return {};
    }
    defender = this;
    initPack.defender = defender;
}
Defender.update = function(){
    if(defender !== null){
        defender.update();
    }
}

var attacker = null;
function Attacker(){
    this.x = 80;
    this.speed = 0.5;
    
    this.update = function(){
        if(this.leftPressed && this.x > screenWidth / 20){
            this.x -= speed;
        }
        if(this.rightPressed && this.x < screenWidth * 19 / 20){
            this.x += speed;
        }
        
        return this.getUpdatePack();
    }
    this.getUpdatePack = function(){
        return {};
    }
    attacker = this;
    initPack.attacker = attacker;
}
Attacker.update = function(){
    if(attacker !== null){
        attacker.update();
    }
}

var earth = null;
function Earth(){
	this.x = screenWidth / 2;
	this.y = 600;
	this.radius = 300;
	this.health = 100;
	
	this.hit = function(){
		health -= 5;
	}
	this.update = function(){
		return this.getUpdatePack();
	}
	this.getUpdatePack = function(){
        return {};
    }
	
	earth = this;
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
    this.speed = 1;
    this.x = x;
    this.y = screenHeight;
    
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
    for(var b in Bullet.list){
        b.update();
    }
};
Bullet.list = {};

function Trash(x){
	this.id = Math.random();
	this.speed = 1;
	this.x = x;
	this.y = 0;
	
    this.update = function(){
    	y += speed;
    	this.earthCollision();
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
    this.clipOffscreen = function() {
    	if(this.x < 0 || this.x > screenWidth || this.y < 0 || this.y > screenHeight)
    		delete Trash.list[this.id];
    }

    Trash.list[this.id] = this;
}
Trash.update = function(){
    for(var t in Trash.list){
        t.update();
    }
}
Trash.list = {};

function gameTimer() {
    time += 1 / framerate;
}

var initPack = {
    attacker: null,
    defender: null,
    bullets: [],
    trash: [],
};

var removePack = {
    attacker: null,
    defender: null,
    bullets: [],
    trash: [],
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
        bullets: [],
        trash: [],
    };

    removePack = {
        bullets: [],
        trash: [],
    };

}, 1000 / framerate);
