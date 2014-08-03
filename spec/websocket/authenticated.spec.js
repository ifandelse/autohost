var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	requestor = require( 'request' ).defaults( { jar: true } ),
	WebSocketClient = require('websocket').client,
	metrics = require( 'cluster-metrics' ),
	when = require( 'when' ),
	port = 88988,
	config = {
		port: port,
		socketio: true,
		websocket: true
	},
	authProvider = {
		authorizer: { checkPermission: function() {} },
		getSocketAuth: function( onSuccess, onFail ) {
			return {
				authenticate: function( req ) {
					if( req.headers.authentication !== 'Basic YWRtaW46YWRtaW4=' ) {
						onFail( 400 );
					} else {
						onSuccess( 'admin', 'admin' );
					}
				}
			};
		},
		getSocketRoles: function() {
			return when( [] );
		}
	},
	http = require( '../../src/http/http.js' )( config, requestor, authProvider, metrics ),
	socket = require( '../../src/websocket/socket.js' )( config, http );

describe( 'with websocket', function() {
	var client,
		clientSocket;

	before( function( done ) {
		http.start();
		socket.start( authProvider );
		
		client = new WebSocketClient();
		client.connect(
			'http://localhost:88988/websocket',
			'echo-protocol', 
			'console', 
			{ 'Authentication': 'Basic YWRtaW46YWRtaW4=' }
		);
		client.on( 'connect', function( cs ) {
			clientSocket = cs;
			done();
		} );
	} );

	describe( 'when passing authentication', function() {
		var fromClient,
			fromServer;

		before( function( done ) {
			socket.on( 'client.message', function( msg, client ) {
				fromClient = msg;
				client.publish( msg.replyTo, { txt: 'hulloo!' } );
			} );

			clientSocket.once( 'message', function( msg ) {
				var json = JSON.parse( msg.utf8Data );
				if( json.topic === 'server.message' ) {
					fromServer = json;
					done();
				}
			} );

			clientSocket.sendUTF( JSON.stringify( { 
				topic: 'client.message', 
				data: { txt: 'ohhai', replyTo: 'server.message' } 
			} ) );
		} );

		it( 'should get client message', function() {
			fromClient.should.eql( { txt: 'ohhai', replyTo: 'server.message' } );
		} );

		it( 'should get server response', function() {
			fromServer.should.eql( { topic: 'server.message', data: { txt: 'hulloo!' } } );
		} );

		it( 'should have a connected socket', function() {
			clientSocket.connected.should.be.true;
		} );
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );