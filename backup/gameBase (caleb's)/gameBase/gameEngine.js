var io;
var gameSocket;

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function(sio, socket) {
    
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected', { message: "You are connected!" });

    // Player Events
    gameSocket.on('playerRematch', playerRematch);
    gameSocket.on('playerQuit', playerQuit);
    
    gameSocket.on('playerJoinMatch', playerJoinMatch);
    gameSocket.on('playerAttack', playerAttack);
}

var matchAvailable = null;
var waitingPlayer = null;

/**
 * A player clicked the 'PUBLIC' button.
 * Attempt to connect them to a match
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinMatch(data) {
    //console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;

    if (matchAvailable === null) {

        createMatch(sock.id);
        sock.join(matchAvailable);
        
        console.log('Player creating match: ' + sock.id);

        // Emit an event notifying the clients that the player has created the room.
        io.sockets.in(matchAvailable).emit('playerCreatedMatch', data);
    }

    // If the match exists...
    else {

        // Join the room
        sock.join(matchAvailable);

        // attach room Id to data object.
        // data.gameId = matchAvailable;

        console.log('Player joining match: ' + sock.id);

        data = { matchId: matchAvailable,
                 player1: sock.id,
                 player2: waitingPlayer
        }

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.to(matchAvailable).emit('playerJoinedMatch', data);

        clearMatch();
    }
}

/**
 * The 'PUBLIC' button was clicked and 'CreateNewMatch' event occurred.
 */
function createMatch(socketId) {

    waitingPlayer = socketId;

    // Create a unique Socket.IO Room
    matchAvailable = ( Math.random() * 10000000 ) | 0;
    console.log('CREATED MATCH ID:' + matchAvailable);
};

/**
 * The waiting room was filled, and the variables are reset for the next match.
 */
function clearMatch() {

    waitingPlayer = null;
    matchAvailable = null;
}


/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */


function playerAttack(data) {
    
    // Emit an event notifying the clients that the player has attacked.
    io.sockets.in(data.match).emit('attack', {attacked: data.opp, damage:data.damage});
}

/**
 * The game is over, and a player has clicked a button to restart the game.
 * @param data
 */
function playerRematch(data) {

    console.log('rematched: ', data.matchId);

    io.sockets.in(data.matchId).emit('rematch');
}

function playerQuit(data) {

    var roster = io.sockets.clients(data.matchId);

    io.sockets.in(data.matchId).emit('quitMatch');
    
    roster.forEach(function(client) {
        client.leave(data.matchId);
    });
}
