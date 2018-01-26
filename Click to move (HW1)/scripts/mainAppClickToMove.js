soundManager.url = 'swf/';
soundManager.flashVersion = 9;
soundManager.debugFlash = false;
soundManager.debugMode = false;

window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
})();


//helper functions
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}


function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = {};
    this.downloadQueue = [];
    this.soundsQueue = [];
}

AssetManager.prototype.queueDownload = function(path) {
    this.downloadQueue.push(path);
}

AssetManager.prototype.queueSound = function(id, path) {
    this.soundsQueue.push({id: id, path: path});
}

AssetManager.prototype.downloadAll = function(downloadCallback) {
    if (this.downloadQueue.length === 0 && this.soundsQueue.length === 0) {
        downloadCallback();
    }
    
    this.downloadSounds(downloadCallback);
    
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function() {
            console.log(this.src + ' is loaded');
            that.successCount += 1;
            if (that.isDone()) {
                downloadCallback();
            }
        }, false);
        img.addEventListener("error", function() {
            that.errorCount += 1;
            if (that.isDone()) {
                downloadCallback();
            }
        }, false);
        img.src = path;
        this.cache[path] = img;
    }
}

AssetManager.prototype.downloadSounds = function(soundsCallback) {
    var that = this;
    soundManager.onready(function() {
        console.log('soundManager ready');
        for (var i = 0; i < that.soundsQueue.length; i++) {
            that.downloadSound(that.soundsQueue[i].id, that.soundsQueue[i].path, soundsCallback);
        }
    });
    soundManager.ontimeout(function() {
        console.log('SM2 did not start');
    });
}

AssetManager.prototype.downloadSound = function(id, path, soundsCallback) {
    var that = this;
    this.cache[path] = soundManager.createSound({
        id: id,
        autoLoad: true,
        url: path,
        onload: function() {
            console.log(this.url + ' is loaded');
            that.successCount += 1;
            if (that.isDone()) {
                soundsCallback();
            }
        }
    });
}

AssetManager.prototype.getSound = function(path) {
    return this.cache[path];
}

AssetManager.prototype.getAsset = function(path) {
    return this.cache[path];
}

AssetManager.prototype.isDone = function() {
    return ((this.downloadQueue.length + this.soundsQueue.length) == this.successCount + this.errorCount);
}

function Animation(spriteSheet, frameWidth, frameDuration, loop) {
    this.spriteSheet = spriteSheet;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight= this.spriteSheet.height;
    this.totalTime = (this.spriteSheet.width / this.frameWidth) * this.frameDuration;
    this.elapsedTime = 0;
    this.loop = loop;
}

Animation.prototype.drawFrame = function(tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    var index = this.currentFrame();
    var locX = x - (this.frameWidth/2) * scaleBy;
    var locY = y - (this.frameHeight/2) * scaleBy;
    ctx.drawImage(this.spriteSheet,
                  index*this.frameWidth, 0,  // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth*scaleBy,
                  this.frameHeight*scaleBy);
}

Animation.prototype.currentFrame = function() {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function() {
    return (this.elapsedTime >= this.totalTime);
}

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function() {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;
    
    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
}

function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    this.timer = new Timer();
    this.stats = new Stats();
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.halfSurfaceWidth = null;
    this.halfSurfaceHeight = null;
}

GameEngine.prototype.init = function(ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.halfSurfaceWidth = this.surfaceWidth/2;
    this.halfSurfaceHeight = this.surfaceHeight/2;
    this.startInput();
    document.body.appendChild(this.stats.domElement);
    
    console.log('game initialized');
}

GameEngine.prototype.start = function() {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}

GameEngine.prototype.startInput = function() {
    console.log('Starting input');
    
    var getXandY = function(e) {
        var x =  e.clientX - that.ctx.canvas.getBoundingClientRect().left - (that.ctx.canvas.width/2);
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top - (that.ctx.canvas.height/2);
        return {x: x, y: y};
    }
    
    var that = this;
    
    this.ctx.canvas.addEventListener("click", function(e) {
        that.click = getXandY(e);
    }, false);
    
    this.ctx.canvas.addEventListener("mousemove", function(e) {
        that.mouse = getXandY(e);
    }, false);
    
    console.log('Input started');
}

GameEngine.prototype.addEntity = function(entity) {
    this.entities.push(entity);
}

GameEngine.prototype.draw = function(drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.ctx.canvas.width/2, this.ctx.canvas.height/2);
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
}

GameEngine.prototype.update = function() {
    var entitiesCount = this.entities.length;
    
    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];
        
        if (!entity.removeFromWorld) {
            entity.update();
        }
    }
    
    for (var i = this.entities.length-1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

GameEngine.prototype.loop = function() {
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.click = null;
    this.stats.update();
}

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function() {
}

Entity.prototype.draw = function(ctx) {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

Entity.prototype.drawSpriteCentered = function(ctx) {
    var x = this.x - this.sprite.width/2;
    var y = this.y - this.sprite.height/2;
    ctx.drawImage(this.sprite, x, y);
}

Entity.prototype.outsideScreen = function() {
    return (this.x > this.game.halfSurfaceWidth || this.x < -(this.game.halfSurfaceWidth) ||
        this.y > this.game.halfSurfaceHeight || this.y < -(this.game.halfSurfaceHeight));
}

Entity.prototype.rotateAndCache = function(image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size/2, size/2);
    offscreenCtx.rotate(angle + Math.PI/2);
    offscreenCtx.translate(0,0);
    offscreenCtx.drawImage(image, -(image.width/2), -(image.height/2));
    offscreenCtx.restore();
    //offscreenCtx.strokeStyle = "red";
    //offscreenCtx.strokeRect(0,0,size,size);
    return offscreenCanvas;
}


function DemoGame() {
	GameEngine.call(this);
	this.lives = 10;
    this.score = 0;
}

DemoGame.prototype = new GameEngine();
DemoGame.prototype.constructor = DemoGame;

DemoGame.prototype.start = function() {
    this.bird = new BirdDude(this, 50, 50, 1);
    this.addEntity(this.bird);
    GameEngine.prototype.start.call(this);
}

//bird sprite
function BirdDude(game, x, y, angle) {
	Entity.call(this, game, x, y);
	//the point this sprite is told to move to
	this.xDest = x;
	this.yDest = y;
	
	this.angle = angle;
	this.speed = 5;
    this.radial_distance = 95;
	this.animation = new Animation(ASSET_MANAGER.getAsset('img/birdsprite.png'), 128, 0.2, true);
	this.radius = this.animation.frameWidth / 2;
}

BirdDude.prototype = new Entity();
BirdDude.prototype.constructor = BirdDude;

BirdDude.prototype.draw = function(ctx) {
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
    Entity.prototype.draw.call(this, ctx);
}

//returns true if this Entity is at its destination
//within a tolerance of TOL pixels
BirdDude.prototype.isAtDest = function() {
	//the tolerance value
	TOL = 3
	return ((this.x -TOL) <= this.xDest && 
			(this.x + TOL) >= this.xDest &&
			(this.y - TOL) <= this.yDest &&
			(this.y + TOL) >= this.yDest)
}

BirdDude.prototype.update = function() {
    Entity.prototype.update.call(this);
	if(this.game.click){
		this.xDest = this.game.mouse.x
		this.yDest = this.game.mouse.y		
		
		tempx = this.xDest-this.x
		tempy = this.yDest-this.y
		
		this.angle = Math.atan2(tempy, tempx);
		if (this.angle < 0) {
            this.angle += Math.PI * 2;
        }
		
	}
	
	if (this.outsideScreen()) {
		//put entity back inside the screen
		if(this.x > this.game.halfSurfaceWidth) {
			this.x -= 5
		} else if(this.x < -(this.game.halfSurfaceWidth)) {
			this.x += 5
		}
		
		if(this.y > this.game.halfSurfaceHeight) {
			this.y -= 5
		} else if(this.y < -(this.game.halfSurfaceHeight)) {
			this.y += 5
		}
		
		//make entity stand still
		this.xDest = this.x
		this.yDest = this.y
		
    } else {
		//move towards destination
		if(!this.isAtDest()){
			this.x += this.speed*Math.cos(this.angle);
			this.y += this.speed*Math.sin(this.angle);
		}
    }
	
	console.log("BirdDude ("+this.x+", "+this.y+")"+" outside screen? "+this.outsideScreen());
}

var canvas = document.getElementById('surface');
var ctx = canvas.getContext('2d');
var game = new DemoGame();
var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload('img/birdsprite.png');


ASSET_MANAGER.downloadAll(function() {
    game.init(ctx);
    game.start();
});