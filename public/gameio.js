var IO;
jQuery(function($){
    'use strict';

    IO = {
      mySocketId: 0,
        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        bindEvents : function() {
            IO.socket.on('connected', IO.onConnected );
            IO.socket.on('message', IO.message );
            IO.socket.on('error', IO.message);
            // IO.socket.on('playerJoinedRoom', IO.onPlayerJoinedRoom );
            IO.socket.on('onServerTick', IO.onServerTick );
        },

        /**
         * The client is successfully connected!
         */
        onConnected : function(data) {
            if(!IO.myName) {
              IO.myName = prompt("Name") || IO.socket.id;
            }
            IO.mySocketId = IO.socket.id;
            console.log("Connected! My Id is " + IO.mySocketId + " name is " + IO.myName);
            IO.socket.emit("playerJoinGame", {name: IO.myName});
        },
        onServerTick: function(data) {
          GameTickHandler.instance.scores = data.scores;
          var ss = data.entities;
          //if(Math.random() < .99) return;
          var es = new Array();
          var flagged = {};
          var flags = {};
          for(var i=0;i<ss.length;i++) {
            var ent = IO.deserialize(ss[i]);
            if(ent.playerId == IO.socket.id) {
              player = ent;
            }
            if(ent.flag) {
              flagged[ent.teamId] = ent;
            }
            if(ent instanceof Flag) {
              flags[ent.teamId] = ent;
            }
            es.push(ent);
          }
          for(var i=1;i<=2;i++) {
            if(flagged[i]) {
              flagged[i].flag = flags[3-i];
            }
          }
          GameTickHandler.instance.entities = es;
          if(!gameArea.started) {
              gameArea.start();
          }
        },
        //  Missile
        deserialize: function(data) {
          var props = data.props;
          var type = data.type;
          var ent = new window[type]();
          Object.assign(ent, props);
          if(type == "Wall") {
            ent.point0 = new Vector(ent.point0.x, ent.point0.y);
            ent.point1 = new Vector(ent.point1.x, ent.point1.y);
          }
          if(ent.vertices) {
              var vs = ent.vertices;
              for(var i=0;i<vs.length;i++) {
                vs[i] = new Vector(vs[i].x, vs[i].y);
              }
          }
          if(ent.center) {
            ent.center = new Vector(ent.center.x, ent.center.y);
          }
          if(ent.velocity) {
            ent.velocity = new Vector(ent.velocity.x, ent.velocity.y);
          }
          if(ent.acceleration) {
            ent.acceleration = new Vector(ent.acceleration.x, ent.acceleration.y);
          }
          return ent;
        },
        /**
         * An error has occurred.
         * @param data
         */
        message : function(data) {
            gameArea.debugText = data.message;
        }

    };

}($));
