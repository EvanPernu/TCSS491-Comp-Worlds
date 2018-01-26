jQuery(function($){    
    'use strict';

    /**
     * All the code relevant to Socket.IO is collected in the IO namespace.
     *
     * @type {{init: Function, bindEvents: Function, onConnected: Function, onNewGameCreated: Function, playerJoinedRoom: Function, beginNewGame: Function, onNewWordData: Function, hostCheckAnswer: Function, gameOver: Function, error: Function}}
     */
    var IO = {

        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {

            IO.socket = io.connect();
            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents : function() {

            IO.socket.on('connected', IO.onConnected );
            IO.socket.on('matchOver', IO.matchOver);
            IO.socket.on('error', IO.error );

            IO.socket.on('playerCreatedMatch', App.playerCreatedMatch);
            IO.socket.on('playerJoinedMatch', App.playerJoinedMatch);
            IO.socket.on('opponent', App.Player.setOpponent);
            IO.socket.on('attack', App.Player.attacked);
            IO.socket.on('rematch', App.rematch);
            IO.socket.on('quitMatch', App.quitMatch);
        },

        /**
         * The client is successfully connected!
         */
        onConnected : function() {

            // Cache a copy of the client's socket.IO session ID on the App
            App.mySocketId = IO.socket.socket.sessionid;
        },

        /**
         * An error has occurred.
         * @param data
         */
        error : function(data) {

            alert(data.message);
        }

    };

    var App = {

        /**
         * Keep track of the matchId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        matchId: '',

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        mySocketId: '',


        rematched: 0,


        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {

            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {

            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$battleScreen = $('#battle-screen-template').html();
            App.$endGame = $('#end-game-template').html();
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {

            // Player
            App.$doc.on('click', '#btnPlayerRematch', App.rematchClicked);
            App.$doc.on('click', '#btnPlayerQuit', App.quitMatchClicked);

            App.$doc.on('click', '#btnPubGame', App.Player.onPublicClick);
            App.$doc.on('click', '#btnAttack', App.Player.attack);
        },

        /* *************************************
         *             Game Logic              *
         * *********************************** */

        /**
         * Show the initial Title Screen
         * (with Start, Public, and Join buttons)
         */
        showInitScreen: function() {

            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },


        /**
         * A new game has been created and a random match ID has been generated.
         * @param data {{ matchId: int, mySocketId: * }}
         */
        playerCreatedMatch : function(data) {
            
            $('#gameArea')
            .html('<div class="gameOver">Searching for opponent...</div>');
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        playerJoinedMatch : function(data) {

            console.log('Both players joined: ' + data.matchId);

            App.matchId = data.matchId;

            if ( data.player1 === App.mySocketId) {

                App.Player.oppId = data.player2;
            }

            else {

                App.Player.oppId = data.player1;
            }

            // Display the Join Game HTML on the player's screen.
            App.showMatch();
        },

        showMatch: function() {
        
            // Display the battle on the player's screen.
            App.$gameArea.html(App.$battleScreen);
        },

        updateMatch: function() {

            if (App.Player.oppHp <= 0) {

                App.Player.oppHp = 0;
            } 
            
            else if (App.Player.myHp <= 0) {

                App.Player.myHp = 0;
            }

            // Set the HP section on screen for each player.
            $('#player1Hp').find('.HP').text(App.Player.myHp);
            $('#player2Hp').find('.HP').text(App.Player.oppHp);
            
            App.checkWin();
        },

        checkWin: function() {

            if (App.Player.oppHp === 0 | App.Player.myHp === 0) {

                App.endMatch();
            }
        },

        /**
         * Show the "Game Over" screen.
         */
        endMatch : function() {

            App.$gameArea.html(App.$endGame);
        },

        rematch : function() {

            App.rematched += 1;

            console.log(App.rematched);
            
            if (App.rematched === 2) {
                
                App.showMatch();
                App.Player.myHp = 100;
                App.Player.oppHp = 100;
                App.rematched = 0;
            }
        },

        rematchClicked : function() {

            IO.socket.emit('playerRematch', App.matchId);
            $('#gameArea').html('<div class="gameOver">Waiting for opponent response...</div>');
        },

        quitMatchClicked : function() {

            IO.socket.emit('playerQuit', App.matchId);   
        },

        quitMatch : function() {

            App.Player.myHp = 100;
            App.Player.oppHp = 100;

            App.showInitScreen();
        },

        /* *****************************
           *        PLAYER CODE        *
           ***************************** */

        Player : {

            /**
             * A reference to the socket ID of the opponent
             */
            oppId: '',

            /**
             * The player's name entered on the 'Join' screen.
             */
            myName: '',

            /**
             * The player's Health Points.
             */
            myHp: 100,

            /**
             * The opponent's Health Points.
             */
            oppHp: 100,

            /**
             * The player clicked to enter a public match.
             */
            onPublicClick: function() {

                // collect data to send to the server
                var data = {
                    playerId : App.mySocketId,
                    playerName : 'Caleb'
                };

                // Send the gameId and playerName to the server
                IO.socket.emit('playerJoinMatch', data);
                console.log('SENT');

                // Set the appropriate properties for the current player.
                App.Player.myName = data.playerName;
            },

            /**
             *  Click handler for the "Start Again" button that appears
             *  when a game is over.
             */
            onPlayerRestart : function() {
                
                var data = {
                    gameId : App.gameId,
                    playerName : App.Player.myName
                }

                IO.socket.emit('playerRematch', data);
                App.currentRound = 0;
                $('#gameArea').html("<h3>Waiting on host to start new game.</h3>");
            },

            /**
             * Set opponent ID.
             */
            setOpponent: function(data) {

                App.Player.oppId = data;
                console.log('Opponent: ' + data);
            },

            /**
             * Attack opponent.
             */
            attack: function() {

                console.log(App.matchId);
                var dmg = ( Math.random() * 10 ) | 0;
                // var currentRoom = IO.socket.rooms[Object.keys(IO.socket.rooms)[0]];
                IO.socket.emit('playerAttack', {damage:dmg, match: App.matchId, opp: App.Player.oppId});
                console.log('ATTACK: ' + dmg);
            },

            /**
             * Attacked by opponent.
             */
            attacked: function(data) {

                if ( data.attacked === App.mySocketId) {
                    
                    App.Player.myHp -= data.damage;
                    console.log('ATTACKED: ' + data.damage);
                }
                    
                else {
                    App.Player.oppHp -= data.damage;
                }
                
                App.updateMatch();
            },
        },


        /* **************************
                  UTILITY CODE
           ************************** */

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit : function(el) {
            
            textFit( $(el)[0], {

                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
            );
        }
    };

    IO.init();
    App.init();

}($));
