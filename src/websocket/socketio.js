var _ = require( 'lodash' ),
	socketio = require( 'socket.io' ),
	authStrategy,
	registry,
	config,
	io;

function acceptSocket( socket ) {
	var handshake = socket.handshake;

	// grab user from request
	socket.user = {
		id: handshake.id || handshake.user || 'anonymous',
		name: handshake.user || 'anonymous' 
	};
	
	// copy cookies from request from middleware
	socket.cookies = {};
	if( handshake.headers.cookie ) {
		_.each( handshake.headers.cookie.split( ';' ), function( cookie ) {
			var crumbs = cookie.split( '=' );
			socket.cookies[ crumbs[ 0 ].trim() ] = crumbs[ 1 ].trim();
		} );
	}

	// attach roles to user on socket
	if( authStrategy ) {
		authStrategy.getSocketRoles( socket.user )
			.then( function( roles ) {
				socket.user.roles = roles;
			} );
	}

	// normalize socket publishing interface
	socket.publish = function( topic, message ) {
		socket.json.send( { topic: topic, body: message } );
	};

	// if client identifies itself, register id
	socket.on( 'client.identity', function( data, socket ) {
		socket.id = data.id;
		registry.identified( id, socket );
	} );

	// add anonymous socket
	registry.add( socket );

	// subscribe to registered topics
	_.each( registry.topics, function( callback, topic ) {
		if( callback ) {
			socket.on( topic, function( data ) { callback( data, socket ); } );
		}
	} );

	socket.publish( 'server.connected', { user: socket.user } );
	socket.on( 'disconnect', function() { 
		registry.remove( socket ); 
	} );
}

function authSocketIO( socket, callback ) {
	var handshake = socket.request;
	if( authStrategy ) {
		var success = 	function( user, id ) {
							handshake.user = user;
							handshake.id = id;
							callback();
						},
			failure	= 	function( status, challenge ) {
							var reject;
							if( status == 400 ) {
								reject = new Error( { status: status, reason: 'Invalid credentials' } );
							} else {
								reject = new Error( { status: 401, reason: 'Authentication Required' } );
							}
							callback( reject );
						};
			strategy = authStrategy.getSocketAuth( success, failure );
		strategy.authenticate( handshake );
	} else {
		handshake.user = 'anonymous';
		callback( null, true );
	}
}

function configureSocketIO( http ) {
	io = socketio( http.server );
	io.use( authSocketIO );
	io.on( 'connection', acceptSocket );
}

module.exports = function( cfg, reg, auth ) {
	config = cfg;
	authStrategy = auth;
	registry = reg;
	return {
		config: configureSocketIO
	}
};