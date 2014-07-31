var _ = require( 'lodash' ),
	WS = require ( 'websocket' ).server,
	authStrategy,
	registry,
	config;

function allowOrigin( origin ) {
	return origin == config.origin;
}

function acceptSocketRequest( user, id, request ) {
	var protocol = request.requestedProtocols[ 0 ];
	var socket = request.accept( protocol, request.origin );
	
	// grab user from request
	socket.user = {
		id: id || user || 'anonymous',
		name: user || 'anonymous' 
	};

	// grab cookies parsed from middleware
	socket.cookies = request.cookies;

	// attach roles to user on socket
	if( authStrategy ) {
		authStrategy.getSocketRoles( socket.user )
			.then( function( roles ) {
				socket.user.roles = roles;
			} );
	}

	// reprocess generic message with topic sent
	socket.on( 'message', function( message ) {
		if( message.type == 'utf8' ) {
			var json = JSON.parse( message.utf8Data );
			this.emit( json.topic, json.body, socket );
		}
	} );

	// normalize socket publishing interface
	socket.publish = function( topic, message ) {
		var payload = JSON.stringify( { topic: topic, body: message } );
		this.sendUTF(payload);
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
	socket.on( 'close', function() { 
		registry.remove( socket ); 
	} );
}

function configureWebsocket( http ) {
	if( config.websockets ) {
		socketServer = new WS( { 
			httpServer: http.server,
			autoAcceptConnections: false 
		} );
		socketServer.on( 'request', handleWebSocketRequest );
	}
}

function handleWebSocketRequest( request ) {
	// if this doesn't end in websocket, we should ignore the request, it isn't for this lib
	if( !/websocket[\/]?$/.test( request.url ) ) {
		return;
	}

	// check origin
	if( !allowOrigin( request.origin ) ) {
		request.reject();
		return;
	}
	
	if( authStrategy ) {
		var success = 	function( user, id ) {
							acceptSocketRequest( user, id, request );
						},
			failure	= 	function( status, challenge ) {
							if( status == 400 ) {
								request.reject( status, 'Invalid credentials' );
							} else {
								request.reject( 401, 'Authentication Required', { 'WWW-Authenticate': status } );
							}
						},
			strategy = authStrategy.getSocketAuth( success, failure );
		strategy.authenticate( request.httpRequest );	
	} else {
		acceptSocketRequest( 'anonymous', 'anonymous', request );
	}
}

module.exports = function( cfg, reg, auth ) {
	config = cfg;
	authStrategy = auth;
	registry = reg;
	return {
		config: configureWebsocket
	}
};