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
    socket.on(`shoot-trash`, function(){
        
    });
    socket.on(`shoot`, function(){
        
    });
    socket.on(`plant`, function(){
        
    });
});

var framerate = 1000 / 40;
var newEntities = false;
var time;

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
    attacker = this;
}
Attacker.update = function(){
    if(attacker !== null){
        attacker.update();
    }
}

var Player = {};
Player.onConnect = function (socket) {
    if(socket.id == 0){
       new Defender(); 
    }else if(socket.id == 1){
        new Attacker();
    }
};

function Bullet(){
    this.update = function(){
       return this.getUpdatePack(); 
    }
    this.getUpdatePack = function(){
        return {};
    }
}
Bullet.update = function(){
    for(var b in Bullet.list){
        b.update();
    }
}

function Trash(){
    this.update = function(){
       return this.getUpdatePack(); 
    }
    this.getUpdatePack = function(){
        return {};
    }
}
Trash.update = function(){
    for(var t in Trash.list){
        t.update();
    }
}

function gameTimer() {
    time += 1 / framerate;
}

setInterval(function () {
    gameTimer();

    var initPack = {};
    
    var pack = {
        defender: Defender.update(),
        attacker: Attacker.update(),
        bullet: Bullet.update(),
        trash: Trash.update(),
    };
    
    var removePack ={};
    
    io.emit(`init`, initPack);
    io.emit(`update`, pack);
    io.emit(`remove`, removePack);

}, 1000 / framerate);

