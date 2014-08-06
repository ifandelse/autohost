var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	requestor = require( 'request' ).defaults( { jar: false } ),
	metrics = require( 'cluster-metrics' ),
	when = require( 'when' ),
	port = 88988,
	config = {
		port: port,
		socketio: true,
		websocket: true
	},
	authProvider = require( '../auth/mock.js' )( config ),
	passport = require( '../../src/http/passport.js' )( config, authProvider, metrics ),
	middleware = require( '../../src/http/middleware.js' )( config, metrics ),
	http = require( '../../src/http/http.js' )( config, requestor, passport, middleware, metrics ),
	socket = require( '../../src/websocket/socket.js' )( config, http, middleware );

authProvider.users[ 'test' ] = { user: 'torpald' };

describe( 'with failed socket.io credentials', function() {
	var socketErr,
		client;

	before( function( done ) {
		http.start();
		socket.start( passport );
		var io = require( 'socket.io-client' );
		client = io( 'http://localhost:88988' );
		client.once( 'connect_error', function( data ) {
			socketErr = data;
			done();
		} );
	} );

	it( 'should get a connection error', function() {
		socketErr.toString().should.equal( 'Error: xhr poll error' );
	} );

	it( 'should disconnect the socket', function() {
		client.connected.should.be.false;
	} );

	after( function() {
		socket.stop();
		http.stop();
		delete require.cache[ require.resolve( 'socket.io-client' ) ];
	} );
} );