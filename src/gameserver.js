var io;
var gameId = "default";
const tc1 = "rgb(242, 180, 24)";
const tc1_dark = "rgb(200, 150, 6)";
const tc2 = "rgb(12, 180, 242)";
const tc2_dark = "rgb(6, 150, 200)";
const obstacleColor = "#D6EAF8";
var Geom = require("../public/geom.js");
var GameTickHandler = require("../public/GameTickHandler.js").GameTickHandler;
Geom.loadGameTickHandler(GameTickHandler);
const tickRate = 60;
const updateRate = 12;
var Region = Geom.Region;
var Vector = Geom.Vector;
var Player = Geom.Player;
var Wall = Geom.Wall;
var Flag = Geom.Flag;
var width = 2000;
var height = 2000;
var gameTickHandler;
var gameRestartTime = false;
var tickInterval = false, broadcastInterval = false;
/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initClient = function(socket){
  console.log(socket.id + " connected");
    socket.join(gameId);
    socket.emit('connected');
    socket.on('playerJoinGame', playerJoinGame);
    socket.on('playerMovement', playerMovement);
    socket.on('playerFire', playerFire);
    socket.on('disconnect', playerDisconnect);
}

exports.initGame = function(sio) {
  io = sio;
  gameTickHandler = new GameTickHandler();
  players = { };
  teamCounts = [-1,0,0];
  buildMap();
  if(tickInterval)
    clearInterval(tickInterval);
  if(broadcastInterval)
    clearInterval(broadcastInterval);
  tickInterval = setInterval(function() {serverTick();}, Math.floor(1000/tickRate));
  broadcastInterval = setInterval(function() {serverBroadcast();}, Math.floor(1000/updateRate));
  console.log("Game room initialized");
}
function objToString (obj) {
    var str = '';
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str += p + '::' + obj[p] + '\n';
        }
    }
    return str;
}
function playerDisconnect() {
  var player = players[this.id];
  console.log(this.id + (player ? (" (" + player.name + ")") : "") + " disconnected");
  if(!player)
    return;
  delete players[this.id];
  teamCounts[player.teamId]--;
  player.flag.active = true;
  gameTickHandler.removeEntity(player);
}
function playerMovement(keyMask) {
  var player = players[this.id];
  if(!player) return;
  player.createAcceleration(keyMask);
}
function playerFire(pos) {
  var player = players[this.id];
  if(!player) return;
  player.fire(new Vector(pos[0], pos[1]));
}
function playerJoinGame(inData) {
    if(players[this.id])
      return;
    var room = this.rooms[gameId];
    if( room != undefined) {
        // attach the socket id to the data object.
        var data = {
          socketId: this.id,
          gameId: gameId
        }
        this.join(gameId);
        io.sockets.in(gameId).emit('playerJoinedRoom', data);


        var team;
        if(teamCounts[1] < teamCounts[2]) {
          team = 1;
        } else if(teamCounts[2] < teamCounts[1]) {
          team = 2;
        } else {
          team = Math.random() < .5 ? 1 : 2;
        }
        teamCounts[team]++;
        var player = new Player(this.id, inData.name, team, team == 1 ? new Vector(50,50) : new Vector(50,height-50), 25);
        players[this.id] = player;
        console.log("Added player with id " + this.id + " name " + inData.name);
        gameTickHandler.addEntity(player);
        //var region = new Region(0, "rgb(" +  (Math.random()*255|0) + "," + (Math.random()*255|0) + "," + (Math.random()*255|0) + ")", [new Vector(200, 200), new Vector(500, 200), new Vector(500, 500), new Vector(200, 500)]);
        //region.setZ(maxZ++);
        //gameTickHandler.addEntity(region);
    } else {
        this.emit("message", {message: "This room does not exist."})
    }
}
function serverTick() {
  gameTickHandler.Tick();
  if(gameTickHandler.scores[1] >= 3 || gameTickHandler.scores[2] >= 3) {
    if(!gameRestartTime) {
      gameRestartTime = new Date().getTime() + 1000 * 10;
      console.log("Game complete. Restarting server in 10 seconds");
    }
    if(gameRestartTime && new Date().getTime() >= gameRestartTime) {
      console.log("Server restarting...");
      gameRestartTime = false;
      exports.initGame(io);
      io.sockets.in(gameId).emit("connected");
    }
  }
}
// TODO: Don't broadcast every entity (many don't change)
function serverBroadcast() {
  var es = gameTickHandler.entities;
  var serial = new Array();
  for(var i=0;i<es.length;i++) {
    serial.push({
      props: es[i],
      type: es[i].constructor.name
    });
  }
  io.sockets.in(gameId).emit("onServerTick", {entities: serial, scores: GameTickHandler.instance.scores});
}

function buildMap() {
    var w = width, h = height;
    addPoly("rgb(240,240,240)", [new Vector(0, 0), new Vector(w, 0), new Vector(w, h), new Vector(0, h)], true, 0, 3, -1, 101);

    addPoly(tc1, [new Vector(0,0), new Vector(0,h/5), new Vector(w/5,h/5), new Vector(w/5,0)], false, 1);
    addPoly(tc2, [new Vector(0,h), new Vector(0,h-h/5), new Vector(w/5,h-h/5), new Vector(w/5,h)].reverse(), false, 2);

    gameTickHandler.addEntity(new Flag(1, new Vector(w/10,h/10)));
    gameTickHandler.addEntity(new Flag(2, new Vector(w/10,h-h/10)));

    addPoly(obstacleColor, [new Vector(0,h*.45), new Vector(0,h*.55), new Vector(w/2, h*.55), new Vector(w/2, h*.45)]);

    addPoly(obstacleColor, [new Vector(w/2, h/5), new Vector(w/2, h*.3), new Vector(w*.6,h*.3), new Vector(w*.6,h*.2)]);
    addPoly(obstacleColor, [new Vector(w/2, h-h/5), new Vector(w/2, h-h*.3), new Vector(w*.6,h-h*.3), new Vector(w*.6,h-h*.2)].reverse());

    addPoly("#55FF88", [new Vector(700, 150), new Vector(800, 250), new Vector(850, 300), new Vector(825, 200), new Vector(900, 100)]);
}

function addPoly(color, poly, walls = true, type=0, thick=1, regionZ=0, wallZ=100) {
    var region = new Region(type, color, poly);
    region.setZ(regionZ);
  	gameTickHandler.addEntity(region);
  	if(walls) {
  		for(var i=0;i<poly.length;i++) {
              var wall = new Wall("black", thick, poly[i], poly[(i+1)%poly.length]);
              wall.setZ(wallZ);
  			      gameTickHandler.addEntity(wall);
          }
      }
}
