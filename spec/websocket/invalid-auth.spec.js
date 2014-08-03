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
		getSocketRoles: function( user ) {
			return when( [] );
		}
	},
	http = require( '../../src/http/http.js' )( config, requestor, authProvider, metrics ),
	socket = require( '../../src/websocket/socket.js' )( config, http );

describe( 'with bad websocket credentials', function() {
	var socketErr,
		client;

	before( function( done ) {
		http.start();
		socket.start( authProvider );
		client = new WebSocketClient();
		client.connect(
			'http://localhost:88988/websocket',
			'echo-protocol', 
			'console', 
			{ 'Authentication': 'Basic fail' }
		);
		client.once( 'connectFailed', function( error ) {
			socketErr = error;
			done();
		} );
	} );

	it( 'should get a connection error', function() {
		socketErr.toString().should.equal( 'Error: Server responded with a non-101 status: 400\nResponse Headers Follow:\nconnection: close\nx-websocket-reject-reason: Invalid credentials\n' );
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );