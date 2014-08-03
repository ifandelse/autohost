var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	when = require( 'when' ),
	requestor = require( 'request' ).defaults( { jar: true } ),
	
	metrics = require( 'cluster-metrics' ),
	port = 88988,
	config = {
		port: port,
		socketio: true,
		websocket: true
	},
	userRoles = [ 'guest' ],
	actionRoles = {

	},
	authProvider = {
		authorizer: {
			checkPermission: function( user, action ) {
				var requiredRoles = actionRoles[ action ],
					authorized = requiredRoles.length === 0 || _.intersection( requiredRoles, user.roles ).length > 0;
				return when( authorized );
			}
		},
		getSocketAuth: function( onSuccess ) {
			return {
				authenticate: function() {
					onSuccess( 'admin', 'admin' );
				}
			};
		},
		getSocketRoles: function() {
			return when( userRoles );
		}
	},
	http = require( '../src/http/http.js' )( config, requestor, authProvider, metrics ),
	socket = require( '../src/websocket/socket.js' )( config, http ),
	addRoles = function( action, roles ) {
		actionRoles[ action ] = roles;
	},
	socketAdapter = require( '../src/websocket/adapter.js' )( config, authProvider, socket, metrics );

describe( 'with socket module', function() {
	var userRoles = [],
		ioClient,
		wsClient,
		wsSocket,
		cleanup = function() {
			userRoles = [];
			actionRoles = {};
		};

	before( function( done ) {
		var connected = 0,
			check = function() {
				if( ++connected > 1 ) {
					done();
				}
			},
			io = require( 'socket.io-client' ),
			WebSocketClient = require('websocket').client;

		http.middleware( '/', function( req, res, next ) {
			req.user = {
				roles: userRoles
			};
			next();
		} );
		socketAdapter.action( { name: 'test' }, {
			alias: 'call',
			verb: 'get',
			topic: 'call',
			handle: function( env ) {
				env.reply( { data: { youSed: env.data.msg } } );
			}
		}, { topics: {} } );
		http.start();
		socket.start( authProvider );
		ioClient = io( 'http://localhost:88988' );
		ioClient.once( 'connect', check );

		wsClient = new WebSocketClient();
		wsClient.connect(
			'http://localhost:88988/websocket',
			'echo-protocol', 
			'console', 
			{ 'Authentication': 'Basic YWRtaW46YWRtaW4=' }
		);
		wsClient.on( 'connect', function( cs ) {
			wsSocket = cs;
			check();
		} );
	} );

	describe( 'when using socket.io and adequate permissions', function() {
		var result;

		before( function( done ) {
			addRoles( 'test.call', [ 'guest' ] );
			ioClient.once( 'test.call', function( env ) {
				result = env.youSed;
				done();
			} );
			ioClient.emit( 'test.call', { msg: 'hi' } );
		} );

		it( 'should return echo', function() {
			result.should.equal( 'hi' );
		} );

		after( cleanup );
	} );

	describe( 'when using socket.io and inadequate permissions', function() {
		var result;

		before( function( done ) {
			addRoles( 'test.call', [ 'admin' ] );
			userRoles = [ 'guest' ];
			ioClient.once( 'test.call', function( env ) {
				result = env;
				done();
			} );
			ioClient.emit( 'test.call', { replyTo: 'test.call', msg: 'hi' } );
		} );

		it( 'should return error code', function() {
			result.should.equal( 'User lacks sufficient permission' );
		} );

		after( cleanup );
	} );

	describe( 'when using websockets and adequate permissions', function() {
		var result;

		before( function( done ) {
			addRoles( 'test.call', [ 'guest' ] );

			wsSocket.once( 'message', function( msg ) {
				var json = JSON.parse( msg.utf8Data );
				if( json.topic === 'test.call' ) {
					result = json.data.youSed;
					done();
				}
			} );

			wsSocket.sendUTF( JSON.stringify( { 
				topic: 'test.call', 
				data: { msg: 'hi' }
			} ) );
		} );

		it( 'should return echo', function() {
			result.should.equal( 'hi' );
		} );

		after( cleanup );
	} );

	describe( 'when using websockets and inadequate permissions', function() {
		var result;

		before( function( done ) {
			addRoles( 'test.call', [ 'admin' ] );
			wsSocket.once( 'message', function( msg ) {
				var json = JSON.parse( msg.utf8Data );
				if( json.topic === 'test.call' ) {
					result = json.data;
					done();
				}
			} );

			wsSocket.sendUTF( JSON.stringify( { 
				topic: 'test.call', 
				data: { replyTo: 'test.call', msg: 'hi' }
			} ) );
		} );

		it( 'should return error code', function() {
			result.should.equal( 'User lacks sufficient permission' );
		} );

		after( cleanup );
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );