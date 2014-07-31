var path = require( 'path' ),
	_ = require( 'lodash' ),
	config,
	authStrategy,
	socket,
	metrics,
	SocketEnvelope;

var wrapper = {
	action: wireupAction,
	resource: wireupResource,
	start: start
};

function buildActionAlias( resourceName, action ) {
	return [ resourceName, action.alias ].join( '.' );
}

function buildActionTopic( resourceName, action ) {
	return [ resourceName, action.topic ].join( '.' );
}

function checkPermissionFor( user, action ) {
	return authStrategy.checkPermission( user, action )
		.then( null, function() {
			return true;
		} )
		.then( function( granted ) {
			return granted;
		} );
}

function start() {
	socket.start( authStrategy );
}

function wireupResource( resource, basePath ) {
	var meta = { topics: {} };
	_.each( resource.actions, function( action ) {
		wireupAction( resource, action, meta );
	} );
	return meta;
}

function wireupAction( resource, action, meta ) {
	var topic = buildActionTopic( resource.name, action ),
		alias = buildActionAlias( resource.name, action );

	meta.topics[ action.alias ] = { topic: topic };
	socket.on( topic, function( message, socket ) {
		var respond = function() {
			var envelope = new SocketEnvelope( message, socket );
			action.handle.apply( resource, [ envelope ] );
		};
		if( authStrategy ) {
			checkPermissionFor( req.user, alias )
				.then( function( pass ) {
					if( pass ) {
						respond();
					} else {
						socket.publish( { topic: 'unauthorized', message: 'user lacks sufficient permission' } );
					}
				} );
		} else {
			respond();
		}
	} );
}

module.exports = function( cfg, auth, sock, meter ) {
	config = cfg;
	authStrategy = auth;
	socket = sock;
	metrics = meter;
	SocketEnvelope = require( './socketEnvelope.js' );
	return wrapper;
};