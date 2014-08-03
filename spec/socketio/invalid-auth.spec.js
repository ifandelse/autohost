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
		getSocketAuth: function( onSuccess, onFail ) {
			return {
				authenticate: function() {
					onFail( 400 );
				}
			};
		},
		getSocketRoles: function() {
			return when( [] );
		}
	},
	http = require( '../../src/http/http.js' )( config, requestor, authProvider, metrics ),
	socket = require( '../../src/websocket/socket.js' )( config, http );

describe( 'with failed socket.io credentials', function() {
	var socketErr,
		client;

	before( function( done ) {
		failAuth = true;
		http.start();
		socket.start( authProvider );
		client = io( 'http://localhost:88988' );
		client.once( 'error', function( data ) {
			socketErr = data;
			done();
		} );
	} );

	it( 'should get a connection error', function() {
		socketErr.should.equal( '401 - Authentication Required' );
	} );

	it( 'should disconnect the socket', function() {
		client.connected.should.be.false;
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );