(function(exports){

class GameTickHandler {
    constructor(canvas) {
        this.entities = new Array();
        this.scores = [-1,0,0];
        GameTickHandler.instance = this;
    }
    // TODO: Don't call step on entities that don't need a step function
    // TODO: Add back in AI (needs to be fast, server has to run them)
    Tick() {
      if(this.scores[1] == 3 || this.scores[2] == 3)
          return;
      var time = new Date().getTime();
      if(!this.lastTickTime)
        this.lastTickTime = time;
      var elapsed = time - this.lastTickTime;
      this.lastTickTime = time;
      var toRemove = { };
      for (var i = 0; i < this.entities.length; i++) {
          var e = this.entities[i];
          /*if(e instanceof Player && e.teamId == 2 && gameArea.useAI) {
              this.handleAI(e);
          }*/
          var collisions = e.step(elapsed / 1000.0, this.entities);
          if (collisions != null && collisions.length > 0 && e.constructor.name == "Missile") {
              toRemove[e.uid] = true;
          }
      }
      var oldEntities = this.entities.splice(0, this.entities.length);
      for (var i = 0; i < oldEntities.length; i++) {
          var e = oldEntities[i];
          if(!toRemove[e.uid])
            this.entities.push(e);
      }
      this.sortEntitiesZ();
    }
    sortEntitiesZ() {
      this.entities.sort(function(a, b) {
          return a.getZ() - b.getZ();
      });
    }
    addEntity(e) {
        this.entities.push(e);
        this.sortEntitiesZ();
    }
    removeEntity(e) {
    	for(var i = this.entities.length - 1; i >= 0; i--) {
    	    if(this.entities[i] === e) {
    	    	this.entities.splice(i, 1);
    	    }
    	}
    }
    /*  eq(a, b) {
        return Math.abs(a-b) <= 1e-9;
      }
      find(vec, done,c,w,h) {
        var best = new Vector(-1,-1);
        var bestScore = 100000000;
          for(var x=0;x<=w;x+=c) {
              for(var y=0;y<=h;y+=c) {
                var score = new Vector(x,y).sub(vec).mag();
                if(!done[Math.floor(x/c)][Math.floor(y/c)] && score < bestScore) {
                  best = new Vector(Math.floor(x/c),Math.floor(y/c));
                  bestScore = score;
                }
              }
          }
          return best;
      }
      handleAI(p) {
          if(p.aiIter == undefined)
              p.aiIter = -1;
          p.aiIter = (p.aiIter + 1) % 10;
          if(p.aiIter != 0)
              return;
          var targetPosition = p.center;
          if(player.flag) {
            var flag = false;
            for(var ei=0;ei<this.entities.length;ei++) {
              var e = this.entities[ei];
              if(e instanceof Flag) {
                if(p.flag && e.teamId == p.teamId && e.active)
                  flag = e.getCenter();
                if(!p.flag && e.teamId != p.teamId && e.active)
                  flag = e.getCenter();
              }
            }
            if(flag && flag.dist(p.center) < player.center.dist(p.center))
              targetPosition = flag;
            else
              targetPosition = player.center;
              if(Math.random() < .1)
                  p.fire(player.center.sub(p.center));
          } else {
            for(var ei=0;ei<this.entities.length;ei++) {
              var e = this.entities[ei];
              if(e instanceof Flag) {
                if(p.flag && e.teamId == p.teamId)
                  targetPosition = e.getCenter();
                if(!p.flag && e.teamId != p.teamId)
                  targetPosition = e.getCenter();
              }
            }
          }
        const c = 75;
          var w = gameArea.width, h = gameArea.height;
          var W = Math.floor(w/c)+1, H = Math.floor(h/c)+1;
          var dist = new Array(W);
          var done = new Array(W);
          for(var x=0;x<=w;x+=c) {
            dist[Math.floor(x/c)] = new Array(H);
            done[Math.floor(x/c)] = new Array(H);
              for(var y=0;y<=h;y+=c) {
                dist[Math.floor(x/c)][Math.floor(y/c)] = 10000000000;
                for(var ei=0;ei<this.entities.length;ei++) {
                  var e = this.entities[ei];
                  if(!(e instanceof Flag) && e.z != -1 && e.type == 0 && e.containsCircle(new Vector(x,y), p.radius)) {
                    done[Math.floor(x/c)][Math.floor(y/c)] = true;
                  }
                }
              }
          }
          var cVec = this.find(targetPosition, done,c,w,h);
          var cx = cVec.x, cy = cVec.y;
          var sVec = this.find(p.center, done,c,w,h);
          var sx = sVec.x, sy = sVec.y;
          dist[cx][cy] = 0;
          while(1) {
            var minX = -1, minY=-1, minVal = 1000000000;
            for(var x=0;x<w/c;x++) {
              for(var y=0;y<w/c;y++) {
                if(dist[x][y] < minVal && !done[x][y]) {
                  minVal = dist[x][y];
                  minX = x;
                  minY = y;
                }
              }
            }
            if(minX == -1) break;
            done[minX][minY] = true;
            var v = new Vector(minX*c,minY*c);
            for(var dx=-1;dx<=1;dx++) {
              for(var dy=-1;dy<=1;dy++) {
                    if(Math.abs(dx)+Math.abs(dy) == 0) continue;
                var nx = minX + dx, ny = minY + dy;
                if(nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                if(done[nx][ny]) continue;
                dist[nx][ny] = Math.min(dist[nx][ny], dist[minX][minY] + v.sub(new Vector(nx*c,ny*c)).mag());
              }
            }
          }
          var rx = false, ry = false;
          for(var dx=-1;dx<=1;dx++) {
            for(var dy=-1;dy<=1;dy++) {
                if(Math.abs(dx)+Math.abs(dy) == 0) continue;
                var nx = sx + dx, ny = sy + dy;
                if(nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                var weight = new Vector(sx*c,sy*c).sub(new Vector(nx*c,ny*c)).mag();
            if(this.eq(dist[sx][sy] - weight, dist[nx][ny])) {
              rx = dx;
              ry = dy;
            }
          }
        }
          var targetVelocity = new Vector(rx,ry).scaleTo(800);
      //        targetVelocity = targetVelocity.scaleTo(850)
          p.acceleration = targetVelocity.sub(p.velocity.scale(.95));
          p.acceleration = p.acceleration.scaleTo(p.scaleFactor);
      }*/
  }
exports.GameTickHandler = GameTickHandler;
}(typeof exports === 'undefined' ? this : exports));
