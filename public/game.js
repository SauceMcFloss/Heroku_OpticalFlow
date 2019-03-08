window.onload = init;

var gameArea, player, player2;
const obstacleColor = "#D6EAF8";
const fps = 120;
const tickRate = 60;

const tc1 = "rgb(242, 180, 24)";
const tc1_dark = "rgb(200, 150, 6)";
const tc2 = "rgb(12, 180, 242)";
const tc2_dark = "rgb(6, 150, 200)";

function init() {
    gameArea = new GameArea(document.getElementById("canvasDiv"));
    setTimeout(IO.init, 10);
    startGame();
}

function startGame() {
    /*buildMap();
    player = new Player(123, "SamplePlayer1", 1, new Vector(50,50), 25);
    player2 = new Player(124, "SamplePlayer2", 2, new Vector(50,gameArea.height-50), 25);
    //for(var i=0;i<10;i++) {
    //    var player3 = new Player(125+i, "SamplePlayer" + (i+3), 2, new Vector(50,gameArea.height-50), 25);
    //    gameArea.addEntity(player3);
    //}
    gameArea.gameTickHandler.addEntity(player);
    gameArea.gameTickHandler.addEntity(player2);
    */
}

function buildMap() {
    var w = gameArea.width, h = gameArea.height;
    addPoly("rgb(240,240,240)", [new Vector(0, 0), new Vector(w, 0), new Vector(w, h), new Vector(0, h)], true, 0, 3, -1, 101);

    addPoly(tc1, [new Vector(0,0), new Vector(0,h/5), new Vector(w/5,h/5), new Vector(w/5,0)], false, 1);
    addPoly(tc2, [new Vector(0,h), new Vector(0,h-h/5), new Vector(w/5,h-h/5), new Vector(w/5,h)].reverse(), false, 2);

    gameArea.gameTickHandler.addEntity(new Flag(1, new Vector(w/10,h/10)));
    gameArea.gameTickHandler.addEntity(new Flag(2, new Vector(w/10,h-h/10)));

    addPoly(obstacleColor, [new Vector(0,h*.45), new Vector(0,h*.55), new Vector(w/2, h*.55), new Vector(w/2, h*.45)]);

    addPoly(obstacleColor, [new Vector(w/2, h/5), new Vector(w/2, h*.3), new Vector(w*.6,h*.3), new Vector(w*.6,h*.2)]);
    addPoly(obstacleColor, [new Vector(w/2, h-h/5), new Vector(w/2, h-h*.3), new Vector(w*.6,h-h*.3), new Vector(w*.6,h-h*.2)].reverse());

    addPoly("#55FF88", [new Vector(700, 150), new Vector(800, 250), new Vector(850, 300), new Vector(825, 200), new Vector(900, 100)]);
}

function addPoly(color, poly, walls = true, type=0, thick=1, regionZ=0, wallZ=100) {
    var region = new Region(type, color, poly);
    region.setZ(regionZ);
	gameArea.gameTickHandler.addEntity(region);
	if(walls) {
		for(var i=0;i<poly.length;i++) {
            var wall = new Wall("black", thick, poly[i], poly[(i+1)%poly.length]);
            wall.setZ(wallZ);
			gameArea.gameTickHandler.addEntity(wall);
        }
    }
}

class GameArea {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = this.canvas.getContext("2d");
        this.context.save();
        this.started = false;
        this.width = 2000;
        this.height = 2000;
        this.useAI = true;
        this.gameTickHandler = new GameTickHandler();
        this.cameraLocation = new Vector(0,0);
        this.cameraVelocity = new Vector(0,0);

        var self = this;
        setInterval(function() {self.render();}, Math.floor(1000/fps));
    }
    equals(a1, a2) {
      if(a1.length != a2.length)
        return false;
      for(var i=0;i<a1.length;i++) {
        if(a1[i] != a2[i])
          return false;
      }
      return true;
    }
    addControls(keys) {
        var keyMask = 0;
        var last = 0;
        var self = this;
        window.addEventListener('keydown', function(e) {
          	for(var i=0;i<keys.length;i++) {
          		if(e.keyCode == keys[i]) {
          			keyMask |= 1 << i;
          		}
          	}
          if(last != keyMask) {
            IO.socket.emit("playerMovement", keyMask);
            player.createAcceleration(keyMask);
            last = keyMask;
          }
        });
        window.addEventListener('keyup', function (e) {
        	for(var i=0;i<keys.length;i++) {
        		if(e.keyCode == keys[i]) {
              keyMask &= ~(1 << i);
        		}
        	}
          if(last != keyMask) {
            IO.socket.emit("playerMovement", keyMask);
            player.createAcceleration(keyMask);
            last = keyMask;
          }
        });
    }
    start() {
        this.started = true;
        var self = this;
        setInterval(function() {self.gameTickHandler.Tick();}, Math.floor(1000/tickRate));
        this.addControls([87,65,83,68]);

        window.addEventListener('mousedown', function (e) {
        	var rect = self.canvas.getBoundingClientRect();
        	var clickPos = new Vector(e.clientX - rect.left, e.clientY - rect.top).sub(new Vector(self.canvas.width/2, self.canvas.height/2));
          IO.socket.emit("playerFire", [clickPos.x, clickPos.y]);
        })
        window.addEventListener('keyup', function (e) {
        	if(e.keyCode == 90) {
        		self.useAI ^= 1;
        	}
        });
    }
    clear() {
        if (!this.started) return;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = "rgb(100,100,100)";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    restore() {
    	this.context.restore();
    	this.context.save();
    }
    drawGUI(ctx) {
      this.restore();
    	var tmp = window.performance.now();
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, this.canvas.width, 50);
      ctx.fillStyle = "white";
    	ctx.font="20px Georgia";
    	ctx.textAlign="left";
    	ctx.fillText("FPS: " + Math.floor(1000.0/(tmp-this.last)),this.canvas.width-100,30);
    	ctx.textAlign="left";
    	ctx.fillText("Debug: " + this.debugText,10,30);
    	ctx.textAlign="center";
    	ctx.font="30px Georgia";
    	ctx.fillText("Score: " + GameTickHandler.instance.scores[1] + " - " + GameTickHandler.instance.scores[2],this.canvas.width/2,30);
    	this.last = tmp;
    }
    drawEntities(ctx) {
      /*var off = player.center.sub(this.cameraLocation);
      var xrat = Math.abs(off.x);
      var yrat = Math.abs(off.y);
      var deadZone = 100;
      if(xrat >= deadZone || yrat >= deadZone) {
        this.cameraVelocity = off.scale(.01);//this.cameraVelocity.add(off.sub(this.cameraVelocity).scaleTo(.2));
      } else {
        if(this.cameraVelocity.mag() <= .5) {
          this.cameraVelocity = new Vector(0,0)
        }
        this.cameraVelocity = this.cameraVelocity.add(this.cameraVelocity.negate().scaleTo(.5));
      }
      this.cameraLocation = this.cameraLocation.add(this.cameraVelocity);
      */

      this.cameraLocation = new Vector(player.center.x, player.center.y);
      /*var BUFFER = 200;
      this.cameraLocation.x = Math.max(this.cameraLocation.x, this.canvas.width/2-BUFFER);
      this.cameraLocation.x = Math.min(this.cameraLocation.x, 2000-this.canvas.width/2+BUFFER);

      this.cameraLocation.y = Math.max(this.cameraLocation.y, this.canvas.height/2-BUFFER);
      this.cameraLocation.y = Math.min(this.cameraLocation.y, 2000-this.canvas.height/2+BUFFER);*/

      var entities = this.gameTickHandler.entities;
      var cl = this.cameraLocation;
      var tx = -(cl.x - this.canvas.width/2);
      var ty = -(cl.y - this.canvas.height/2);
    	for (var i = 0; i < entities.length; i++) {
            this.restore();
        	  ctx.translate(tx,ty);
            var e = entities[i];
            e.draw(ctx);
      }
    }
    render() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        var ctx = this.context;
        this.restore();
        this.clear();
        if (!this.started || !player) {
            console.log("render");
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = "white";
        	ctx.textAlign="center";
        	ctx.font="100px Georgia";
        	ctx.fillText("QuickshotCTF",this.canvas.width/2,this.canvas.height/2);
        	return;
        }
        if(GameTickHandler.instance.scores[1] == 3 || GameTickHandler.instance.scores[2] == 3) {
        	var winner = GameTickHandler.instance.scores[1] == 3 ? 1 : 2;
            this.drawEntities(ctx);
            this.drawGUI(ctx);
            this.restore();
            ctx.fillStyle = "rgba(0,0,0,.5)";
            ctx.lineWidth = 2;
            ctx.fillRect(this.canvas.width/2-300, this.canvas.height/2-80, 600, 100);
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.strokeRect(this.canvas.width/2-300, this.canvas.height/2-80, 600, 100);

        	ctx.textAlign="center";
        	ctx.font="100px Georgia";
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
        	ctx.strokeText("Team " + winner + " wins!",this.canvas.width/2,this.canvas.height/2);

            ctx.fillStyle = winner == 1 ? tc1 : tc2;
        	ctx.fillText("Team " + winner + " wins!",this.canvas.width/2,this.canvas.height/2);
        	return;
        }
        this.drawEntities(ctx);
        this.drawGUI(ctx);
    }
}
