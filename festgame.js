(function() {
	var timeouts = [];
	var messageName = "zero-timeout-message";

	function setZeroTimeout(fn) {
		timeouts.push(fn);
		window.postMessage(messageName, "*");
	}

	function handleMessage(event) {
		if (event.source == window && event.data == messageName) {
			event.stopPropagation();
			if (timeouts.length > 0) {
				var fn = timeouts.shift();
				fn();
			}
		}
	}

	window.addEventListener("message", handleMessage, true);

	window.setZeroTimeout = setZeroTimeout;
})();

var Neuvol;
var game;
var FPS = 60;
var maxScore=0;

var images = {};

var speed = function(fps){
	FPS = parseInt(fps);
}

var loadImages = function(sources, callback){
	var nb = 0;
	var loaded = 0;
	var imgs = {};
	for(var i in sources){
		nb++;
		imgs[i] = new Image();
		imgs[i].src = sources[i];
		imgs[i].onload = function(){
			loaded++;
			if(loaded == nb){
				callback(imgs);
			}
		}
	}
}

var Player = function(json){
  this.displayx = 21;
  this.displaywidth = 142;
  this.x = 78;
  this.y = 162;
  this.width = 48;
  this.height = 83;

  this.alive = true;
  this.velocity = 0;
  this.acceleration = 0;

  this.init(json)
}

Player.prototype.init = function(json){
  for(var i in json){
    this[i] = json[i];
  }
}

Player.prototype.flap = function(s){
  if(s > 0.5 && this.velocity >= 0){
      this.velocity = 0;
      this.acceleration = -1;
  }
  if(s <= 0.5 && this.velocity <= 0){
    this.velocity = 0;
    this.acceleration = 1;
  }
}

Player.prototype.update = function(){
  this.velocity += this.acceleration;
  this.y += this.velocity;
  /*if(this.y < 0){
    this.y = 0;
  }*/
}

Player.prototype.isDead = function(height, poles, bird){
  if(this.y > height || this.y < 0){
    return true;
  }
  for(var i in poles){
    if(
        this.x <= poles[i].x + poles[i].width &&
        this.x + this.width >= poles[i].x &&
        this.y + this.height >= poles[i].y
      ){
      return true;
    }
  }
  if(bird != undefined){
    if(
      this.x <= bird.x + bird.width &&
      this.x + this.width >= bird.x &&
      this.y + this.height >= bird.y &&
      this.y <= bird.y + bird.height
    ){
      return true;
    }
  }
  return false;
}

var Pole = function(json){
  this.x = 0;
  this.y = 0;
  this.width = 41;

  this.init(json);
}

Pole.speed = 5;

Pole.prototype.init = function(json){
  for(var i in json){
    this[i] = json[i];
  }
}

Pole.prototype.update = function(){
  this.x -= Pole.speed;
}

Pole.prototype.isOut = function(){
  if(this.x + this.width < 0){
    return true;
  }
}

var Bird = function(json){
  this.x = 0;
  this.y = 0;
  this.width = 72;
  this.height = 38;

  this.init(json);
}

Bird.speed = 6;

Bird.prototype.init = function(json){
  for(var i in json){
    this[i] = json[i];
  }
}

Bird.prototype.update = function(){
  this.x -= Bird.speed;
}

Bird.prototype.isOut = function(){
  if(this.x + this.width < 0){
    return true;
  }
}

var Game = function(){
  this.bird = undefined;
  this.poles = [];
  this.players = [];
  this.score = 0;
  this.canvas = document.querySelector("#festy");
  this.ctx = this.canvas.getContext("2d");
  this.width = this.canvas.width;
	this.height = this.canvas.height;
  this.poleSpawnInterval = 80;
  this.birdSpawnInterval = 60;
  this.poleInterval = 0;
  this.birdInterval = 0;
  this.gen = [];
  this.alives = 0;
  this.generation = 0;
  this.backgroundSpeed = 0.5;
  this.backgroundx = 0;
  this.maxScore = 0;
}

Game.prototype.start = function(){
  this.poleInterval = 0;
  this.birdInterval = 0;
  this.score = 0;
  this.poles = [];
  this.players = [];
  this.bird = undefined;

  this.gen = Neuvol.nextGeneration();
  for(var i in this.gen){
    var p = new Player();
    this.players.push(p);
  }
  this.generation++;
  this.alives = this.players.length;
}

Game.prototype.update = function(){
  this.backgroundx += this.backgroundSpeed;
  var nextPolex = 0, nextPoley = 0, nextBirdx = 0, nextBirdy = 0;
  if(this.players.length > 0){
    for(var i in this.poles){
      if(this.poles[i].x + this.poles[i].width > this.players[0].x){
        nextPolex = this.poles[i].x/this.width;
        nextPoley = this.poles[i].y/this.height;
        break;
      }
    }
    if(this.bird != undefined){
      if(this.bird.x + this.bird.width > this.players[0].x){
        nextBirdx = this.bird.x/this.width;
        nextBirdy = this.bird.y/this.height;
      }
    }
  }

  for(var i in this.players){
    if(this.players[i].alive){
      var inputs = [
        this.players[i].y/this.height,
        nextBirdx,
        nextBirdy,
        nextPolex,
        nextPoley
      ];
      if (i==0) console.log(inputs);
			//console.log(inputs);
      var res = this.gen[i].compute(inputs);
      this.players[i].flap(res);
      this.players[i].update();
      if(this.players[i].isDead(this.height, this.poles, this.bird)){
        this.players[i].alive = false;
        this.alives--;
        Neuvol.networkScore(this.gen[i], this.score);
        if(this.isItEnd()){
          this.start();
        }
      }
    }
  }

  for(var i = 0; i < this.poles.length; i++){
    this.poles[i].update();
    if(this.poles[i].isOut()){
      this.poles.splice(i, 1);
      i--;
    }
  }

  if(this.bird != undefined){
    this.bird.update();
    if(this.bird.isOut()){
      this.bird = undefined;
    }
  }

  if(this.poleInterval == 0){
    let height = Math.round(Math.random() * (this.height/3) + (this.height/2));
    p = new Pole({x: this.width, y: height});
    this.poles.push(p);
    this.poleSpawnInterval = 40 + Math.round(Math.random()*40);
  }

  if(this.birdInterval == 0 && this.bird == undefined){
    let height = Math.round(Math.random() * (this.height/2));
    this.bird = new Bird({x: this.width, y: height});
    this.birdSpawnInterval = 60 + Math.round(Math.random()*60);
  }

  this.poleInterval++;
  this.birdInterval++;
  if(this.poleInterval == this.poleSpawnInterval){
    this.poleInterval = 0;
  }
  if(this.birdInterval == this.birdSpawnInterval ){
    this.birdInterval = 0;
  }

  this.score++;
  this.maxScore = (this.score > this.maxScore) ? this.score : this.maxScore;
  var self = this;

  if(FPS == 0){
    setZeroTimeout(function(){
      self.update();
    });
  } else {
    setTimeout(function(){
      self.update();
    }, 1000/FPS);
  }
}

Game.prototype.isItEnd = function(){
  for(var i in this.players){
    if(this.players[i].alive){
      return false;
    }
  }
  return true;
}

Game.prototype.display = function(){
  this.ctx.clearRect(0, 0, this.width, this.height);
  for(var i = 0; i < Math.ceil(this.width / images.background.width) + 1; i++){
    this.ctx.drawImage(images.background, i * images.background.width - Math.floor(this.backgroundx%images.background.width), 0);
  }
  for(var i in this.poles){
    this.ctx.drawImage(images.pole, this.poles[i].x, this.poles[i].y, this.poles[i].width, this.height);
  }

  if(this.bird != undefined){
    this.ctx.drawImage(images.bird, this.bird.x, this.bird.y, this.bird.width, this.bird.height);
  }

  this.ctx.fillStyle = "#FFC600";
  this.ctx.strokeStyle = "#CE9E00";
  for(var i in this.players){
    if(this.players[i].alive){
      this.ctx.drawImage(images.player, this.players[i].displayx, this.players[i].y, this.players[i].displaywidth, this.players[i].height);
    }
  }

  this.ctx.fillStyle = "black";
	this.ctx.font="20px Oswald, sans-serif";
	this.ctx.fillText("Score : "+ this.score, 10, 25);
	this.ctx.fillText("Max Score : "+this.maxScore, 10, 50);
	this.ctx.fillText("Generation : "+this.generation, 10, 75);
	this.ctx.fillText("Alive : "+this.alives+" / "+Neuvol.options.population, 10, 100);

  var self = this;
  requestAnimationFrame(function(){
    self.display();
  });
}

window.onload = function(){
  var sprites = {
    player: "./img/player.png",
    background: "./img/background.png",
    bird: "./img/bird1.png",
    pole: "./img/pole.png"
  }

  var start = function(){
    Neuvol = new Neuroevolution({
      population: 50,
      network: [5 ,[3], 1]
    });
    game = new Game();
    game.start();
    game.update();
    game.display();
  }

  loadImages(sprites, function(imgs){
    images = imgs;
    start();
  });
}
