(function(exports){
  var MyGameTickHandler = typeof GameTickHandler === 'undefined' ? {} : GameTickHandler;
  exports.loadGameTickHandler = function(gth) {
    MyGameTickHandler = gth;
  }
  const tc1 = "rgb(242, 180, 24)";
  const tc1_dark = "rgb(200, 150, 6)";
  const tc2 = "rgb(12, 180, 242)";
  const tc2_dark = "rgb(6, 150, 200)";
  const co_restitution = 0.9;

  class Entity {
      constructor() {
          this.z = 0;
          this.uid = Entity.curId++;
      }
      setZ(z) {
          this.z = z;
      }
      getZ() {
          return this.z;
      }
      step(time, entities) {
          // Do nothing.
      }
      draw(ctx) {
          // Do nothing.
      }
  }
  Entity.curId = 0;

  class Missile extends Entity {
  	constructor(playerId, teamId, color, center, radius, velocity) {
  		super();
      this.playerId = playerId;
      this.teamId = teamId;
  		this.color = color;
  		this.center = center;
  		this.radius = radius;
  		this.velocity = velocity;
          this.setZ(98);
  	}
  	moveTo(center) {
          this.center = center;
      }
      step(time, entities) {
          var newCenter = this.center.add(this.velocity.scale(time));
          var newVelocity = this.velocity;
          var shouldMove = true;
          var collisions = new Array();
          for (var i = 0; i < entities.length; i++) {
              var e = entities[i];
              // Skip ourself.
              if (e == this) continue;
              if(e.playerId == this.playerId) continue;
              if (e instanceof Player) {
                  // This should kill the player.
                  var dir = e.center.sub(this.center);
                  var radiusSum = this.radius + e.radius;
                  if (e.center.sub(newCenter).mag2() <= radiusSum * radiusSum) {
                      collisions.push(e);
                      if(e.flag && e.teamId != this.teamId)
                          e.kill();
                      shouldMove = false;
                      e.velocity = e.velocity.add(this.velocity.scale(.05));
                  }
              } else if (e instanceof Missile) {
                  // Circle-circle intersection.
                  var dir = e.center.sub(this.center);
                  var radiusSum = this.radius + e.radius;
                  if (e.center.sub(newCenter).mag2() <= radiusSum * radiusSum) {
                      collisions.push(e);
                      shouldMove = false;
                  }
              } else if (e instanceof Wall) {
                  // Circle-segment intersection.
                  var line = e.point1.sub(e.point0);
                  var cross = line.cross(this.center.sub(e.point0));
                  // Skip lines that we are on the wrong side of.
                  if (cross < 0) {
                      continue;
                  }
                  if (this.velocity.dot(line.orthoCW()) < 0) {
                      continue;
                  }
                  var closestPoint = Vector.closestPoint(e.point0, e.point1, newCenter);
                  if (closestPoint.sub(newCenter).mag2() <= this.radius * this.radius) {
                      shouldMove = false;
                      newVelocity = newVelocity.reflect(line.orthoCCW());
                      collisions.push(e);
                  }
              } else {
                  // Some other entity we don't care about.
              }
          }
          if (shouldMove) {
              this.center = newCenter;
          } else {
          }
          this.velocity = newVelocity;
          return collisions;
      }
      draw(ctx) {
          super.draw();
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
          ctx.fill();
      }

  }


  class Player extends Entity {
      constructor(playerId, name, teamId, center, radius, velocity = null, acceleration = null) {
          super();
          this.playerId = playerId;
          this.name = name;
          this.teamId = teamId;
          this.color = teamId == 1 ? tc1_dark : tc2_dark;
          this.center = center;
          this.radius = radius;
          this.velocity = velocity == null ? new Vector(0, 0) : velocity;
          this.acceleration = acceleration == null ? new Vector(0, 0) : acceleration;
          this.boostFactor = 1;
          this.scaleFactor = 500;
          this.setZ(99);
          this.flag = false;
          this.lastShot = 0;
      }
      setRadius(radius) {
          this.radius = radius;
      }
      setVelocity(velocity) {
          this.velocity = velocity;
      }
      clearVelocity() {
          this.setVelocity(new Vector(0, 0));
      }
      setAcceleration(acceleration) {
          this.acceleration = acceleration;
      }
      clearAcceleration() {
          this.setAcceleration(new Vector(0, 0));
      }
      createAcceleration(keyMask) {
        var pressed = [false, false, false, false];
        for(var i = 0;i < 4; i++) {
          pressed[i] = (keyMask & (1 << i)) > 0;
        }
      	var newAcc = new Vector(0,0);
      	if(pressed[0] ^ pressed[2]) {
      		if(pressed[0])
      			newAcc.y = -1
      		else
      			newAcc.y = 1
      	}
      	if(pressed[1] ^ pressed[3]) {
      		if(pressed[1])
      			newAcc.x = -1
      		else
      			newAcc.x = 1
      	}
      	this.setAcceleration(newAcc.scaleTo(this.scaleFactor));
      }
      getBoostFactor() {
          return this.boostFactor;
      }
      setBoostFactor(boostFactor) {
          this.boostFactor = boostFactor;
      }
      deltaBoostFactor(time) {
          this.boostFactor += 0.5 * time;
          this.boostFactor = Math.min(this.boostFactor, 1.5);
          this.boostFactor = Math.max(this.boostFactor, 0.666);
      }
      resetBoostFactor() {
          this.setBoostFactor(1);
      }
      getDrag() {
          var dragConstant = 0.000015;
          // DragConstant * Velocity^2 * Cross-sectional Area
          var dragForce = dragConstant * this.velocity.mag2() * (this.radius * 2);
          return this.velocity.negate().scaleTo(dragForce);
      }
      moveTo(center) {
          this.center = center;
      }
      kill() {
      	if(this.flag) {
      		this.flag.active = true;
      		this.flag = false;
      	}
          this.spawn();
      }
      spawn() {
          var es = MyGameTickHandler.instance.entities;
          for(var i=0;i<es.length;i++) {
              if(es[i].type == this.teamId) {
                  this.center = es[i].getCenter();
                  break;
              }
          }
      	this.velocity = new Vector(0,0);
      }
      fire(vec) {
        var time = new Date().getTime();
        if(time < this.lastShot + (this.flag ? 3000 : 400))
          return;
        this.lastShot = time;
        MyGameTickHandler.instance.addEntity(new Missile(this.playerId, this.teamId, "rgb(100,0,0)", this.center, 8, vec.scaleTo(500)));
      }
      step(time, entities) {
          var effectiveAcceleration = this.acceleration.add(this.getDrag());
          if(this.acceleration.mag2() == 0) {
          	if(this.velocity.mag2() < 10) {
          		this.velocity = new Vector(0, 0);
          		this.effectiveAcceleration = new Vector(0, 0);
          	} else {
          		effectiveAcceleration = effectiveAcceleration.add(this.velocity.negate().scaleTo(50));
          	}
          }
          var newCenter = this.center.add(this.velocity.scale(time).add(effectiveAcceleration.scale(time * time / 2.0)).scale(this.getBoostFactor()));
          var newVelocity = this.velocity.add(effectiveAcceleration.scale(time));
          var shouldMove = true;
          var collisions = new Array();
          var hasPositiveBoost = false;
          var hasNegativeBoost = false;
          for (var i = 0; i < entities.length; i++) {
              var e = entities[i];
              // Skip ourself.
              if (e == this) continue;
              if (e instanceof Player) {
                  // Circle-circle intersection.
                  var dir = e.center.sub(this.center);
                  var radiusSum = this.radius + e.radius;
                  if (e.center.sub(this.center).mag2() <= radiusSum * radiusSum)
                      continue;
                  if (e.center.sub(newCenter).mag2() <= radiusSum * radiusSum) {
                      shouldMove = false;
                      var ua = this.velocity;
                      var ub = e.velocity;
                      var va = ub.sub(ua).scale(co_restitution).add(ua).add(ub).scale(.5);
                      var vb = ua.sub(ub).scale(co_restitution).add(ua).add(ub).scale(.5);
  	                va = va.add(e.acceleration.scale(time));
  	                vb = vb.add(this.acceleration.scale(time));

                      newVelocity = va;
                      e.setVelocity(vb);
                      collisions.push(e);

                      if(this.teamId != e.teamId) {
                        var killThis = this.flag != false;
                        var killE = e.flag != false;
                        if(killThis)
                        	this.kill();
                        if(killE)
                        	e.kill();
                      }
                  }
              } else if (e instanceof Wall) {
                  // Circle-segment intersection.
                  var line = e.point1.sub(e.point0);
                  var cross = line.cross(this.center.sub(e.point0));
                  // Skip lines that we are on the wrong side of.
                  if (cross < 0) {
                      continue;
                  }
                  if (this.velocity.dot(line.orthoCW()) < 0) {
                      continue;
                  }
                  var closestPoint = Vector.closestPoint(e.point0, e.point1, newCenter);
                  if (closestPoint.sub(newCenter).mag2() <= this.radius * this.radius) {
                      shouldMove = false;
                      newVelocity = newVelocity.reflect(line.orthoCCW());
                      collisions.push(e);
                  }
              } else if (e instanceof Region) {
                  if (e.containsCircle(this.center, this.radius)) {
                  	if (e instanceof Flag && e.active) {
                      	if(e.teamId != this.teamId) {
                      		e.active = false;
                      		this.flag = e;
                      	} else {
                      		if(this.flag) {
                      			this.flag.active = true;
                      			this.flag = false;
                      			MyGameTickHandler.instance.scores[this.teamId]++;
                      		}
                      	}
                      } else if (e.type == 1) {
                          hasPositiveBoost = true;
                      } else if (e.type == 2) {
                          hasNegativeBoost = true;
                      }
                  }
              } else {
                  // Some other entity we don't care about.
              }
          }
          /*if (hasPositiveBoost && !hasNegativeBoost)
              this.deltaBoostFactor(time);
          else if (hasNegativeBoost && !hasPositiveBoost)
              this.deltaBoostFactor(-time);
          else {
              if (this.getBoostFactor() < 1) {
                  this.deltaBoostFactor(time);
                  if (this.getBoostFactor() > 1)
                      this.setBoostFactor(1);
              } else {
                  this.deltaBoostFactor(-time);
                  if (this.getBoostFactor() < 1)
                      this.setBoostFactor(1);
              }
          }*/

          if (shouldMove) {
              this.center = newCenter;
          } else {
              newVelocity = newVelocity.scale(.75);
          }
          this.velocity = newVelocity;
      }
      draw(ctx) {
          super.draw();
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
          ctx.stroke();

          if(this.flag) {
          	var tmp = new Flag(3-this.teamId, this.center, 10);
          	tmp.draw(ctx);
          }

          ctx.fillStyle = "black";
        	ctx.font="10px Georgia";
        	ctx.textAlign="center";
        	ctx.fillText("'" + this.name + "'",this.center.x, this.center.y+this.radius+10);
      }
  }

  class Wall extends Entity {
      constructor(color, width, point0, point1) {
          super();
          this.color = color;
          this.width = width;
          this.point0 = point0;
          this.point1 = point1;
          this.setZ(100);
      }
      setColor(color) {
          this.color = color;
      }
      setWidth(width) {
          this.width = width;
      }
      setPoint0(point0) {
          this.point0 = point0;
      }
      setPoint1(point1) {
          this.point1 = point1;
      }
      setPoints(point0, point1) {
          this.point0 = point0;
          this.point1 = point1;
      }
      draw(ctx) {
          super.draw();
          ctx.beginPath();
          ctx.moveTo(this.point0.x, this.point0.y);
          ctx.lineWidth = this.width;
          ctx.lineCap = 'round';
          ctx.lineTo(this.point1.x, this.point1.y);
          ctx.strokeStyle = this.color;
          ctx.stroke();
      }
  }

  class Region extends Entity{
  	constructor(type, color, vertices) {
  		super()
  		this.type = type;
  		this.color = color;
  		this.vertices = vertices;
          this.setZ(0);
  	}
  	contains(p) {
          var wn = 0;
          var vs = this.vertices;
          for (var i = 0; i < vs.length; i++) {
              var v1 = vs[i], v2 = i == vs.length - 1 ? vs[0] : vs[i + 1];
              var v12 = v2.sub(v1);
              var pv = p.sub(v1);
              var cross = v12.cross(pv);
              if (v1.y < p.y && v2.y >= p.y && cross > 0) wn++;
              else if (v1.y >= p.y && v2.y < p.y && cross < 0) wn--;
          }
          return wn != 0;
      }
  	containsCircle(p, r) {
  		if(this.contains(p))
  			return true;
  	    var vs = this.vertices;
  	    for (var i = 0; i < vs.length; i++) {
  	    	var cp = Vector.closestPoint(vs[i], vs[(i+1)%vs.length], p);
  	    	if(cp.sub(p).mag2() <= r*r)
  	    		return true;
  	    }
  	    return false;
  	}
  	draw(ctx) {
  		ctx.fillStyle = this.color;
  		ctx.beginPath();
  		ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
  		for (var i = 1, len = this.vertices.length; i < len; i++) {
  			ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
  		}
  		ctx.lineTo(this.vertices[0].x, this.vertices[0].y);
  		ctx.closePath();
  		ctx.fill();
  	}
  	drawStroke(ctx) {
  		ctx.strokeStyle = "black"
  		ctx.beginPath();
  		ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
  		for (var i = 1, len = this.vertices.length; i < len; i++) {
  			ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
  		}
  		ctx.lineTo(this.vertices[0].x, this.vertices[0].y);
  		ctx.closePath();
  		ctx.stroke();
  	}
      getCenter() {
          var sum = new Vector(0,0);
          for(var i=0;i<this.vertices.length;i++) {
              sum = sum.add(this.vertices[i]);
          }
          sum = sum.scale(1.0/this.vertices.length);
          return sum;
      }

  }


  class Flag extends Region {
  	constructor(teamId, center, f_size=15) {
  		super(0, "", []);
          this.f_size = f_size;
          this.color = teamId == 1 ? tc1_dark : tc2_dark;
          this.center = center;
          if(center) {
            var cx = center.x, cy = center.y;
            this.vertices = [new Vector(cx-f_size,cy-f_size),new Vector(cx-f_size,cy+f_size*2),new Vector(cx+f_size,cy+f_size*2),new Vector(cx+f_size,cy-f_size)];
          }
          this.teamId = teamId;
          this.setZ(101);
          this.active = true;
  	}
  	draw(ctx) {
          var f_size = this.f_size;
          var cx = this.center.x, cy = this.center.y;
          var tmpCol = this.color;
          var tmpVert = this.vertices;

  		if(!this.active)
              this.color = "#AAAAAA";
          this.vertices = [new Vector(cx-f_size,cy-f_size),new Vector(cx-f_size,cy+f_size/3),new Vector(cx+f_size,cy+f_size/3),new Vector(cx+f_size,cy-f_size)];

      	super.draw(ctx);
  		super.drawStroke(ctx);

          ctx.beginPath();
          ctx.moveTo(cx-f_size, cy-f_size);
          ctx.lineWidth = 1;
          ctx.lineCap = 'round';
          ctx.lineTo(cx-f_size, cy+f_size*2);
          ctx.strokeStyle = "black";
          ctx.stroke();

          this.color = tmpCol;
          this.vertices = tmpVert;
  	}
  }

  class Vector {
      constructor(x, y) {
          this.x = x;
          this.y = y;
      }
      add(v) {
          return new Vector(this.x + v.x, this.y + v.y);
      }
      sub(v) {
          return new Vector(this.x - v.x, this.y - v.y);
      }
      scale(s) {
          return new Vector(this.x * s, this.y * s);
      }
      normalize() {
          if (this.mag() < 1e-9) return new Vector(0, 0);
          return this.scale(1.0 / this.mag());
      }
      scaleTo(s) {
          return this.normalize().scale(s);
      }
      orthoCCW() {
          return new Vector(-this.y, this.x);
      }
      orthoCW() {
          return new Vector(this.y, -this.x);
      }
      negate() {
          return new Vector(-this.x, -this.y);
      }
      dot(v) {
          return this.x * v.x + this.y * v.y;
      }
      cross(v) {
          return this.x * v.y - this.y * v.x;
      }
      mag2() {
          return this.dot(this);
      }
      mag() {
          return Math.sqrt(this.mag2());
      }
      dist(v) {
      	return this.sub(v).mag();
      }
      // Reflects this vector accros the vector n
      reflect(n) {
          n = n.normalize();
          return this.sub(n.scale(2 * this.dot(n)));
      }
      // Returns the closest point on the line segment l1->l2 to p
      static closestPoint(l1, l2, p) {
          var line = l2.sub(l1);
          var l = line.dot(line);
          var t = p.sub(l1).dot(line) / l;
          if (t < 0) return l1;
          else if(t > 1) return l2;
          return line.scale(t).add(l1);
      }
      static EPS() {
          return 1e-6;
      }
      static equals(a, b) {
          return Math.abs(a - b) < Vector.EPS();
      }
  }
  exports.Entity = Entity;
  exports.Missile = Missile;
  exports.Player = Player;
  exports.Wall = Wall;
  exports.Region = Region;
  exports.Flag = Flag;
  exports.Vector = Vector;
}(typeof exports === 'undefined' ? this : exports));
