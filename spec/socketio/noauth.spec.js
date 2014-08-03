var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	requestor = require( 'request' ).defaults( { jar: true } ),
	io = require( 'socket.io-client' ),
	metrics = require( 'cluster-metrics' ),
	when = require( 'when' ),
	port = 88988,
	config = {
		port: port,
		socketio: true,
		websocket: true
	},
	authProvider = {
		authorizer: {
			checkPermission: function() {}
		},
		getSocketAuth: function( onSuccess ) {
			return {
				authenticate: function() {
					onSuccess( 'test', 'test' );
				}
			};
		},
		getSocketRoles: function() {
			return when( [] );
		}
	},
	http = require( '../../src/http/http.js' )( config, requestor, authProvider, metrics ),
	socket = require( '../../src/websocket/socket.js' )( config, http );

describe( 'with socketio', function() {
	var client;

	before( function( done ) {
		http.start();
		socket.start( authProvider );
		client = io( 'http://localhost:88988' );
		client.once( 'connect', function() {
			done();
		} );
	} );

	describe( 'when skipping authentication', function() {
		var fromClient,
			fromServer;

		before( function( done ) {
			socket.on( 'client.message', function( msg, client ) {
				if( msg.txt === 'ohhai' ) {
					fromClient = msg;
					client.publish( msg.replyTo, { txt: 'hulloo!' } );
				}
			} );

			client.on( 'server.message', function( msg ) {
				fromServer = msg;
				done();
			} );
			client.emit( 'client.message', { txt: 'ohhai', replyTo: 'server.message' } );
		} );

		it( 'should get client message', function() {
			fromClient.should.eql( { txt: 'ohhai', replyTo: 'server.message' } );
		} );

		it( 'should get server response', function() {
			fromServer.should.eql( { txt: 'hulloo!' } );
		} );

		it( 'should have a connected socket', function() {
			client.connected.should.be.true;
		} );
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );