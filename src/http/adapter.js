var path = require( 'path' ),
	_ = require( 'lodash' ),
	HttpEnvelope,
	http,
	config, 
	metrics, 
	authStrategy;

var wrapper = {
	action: wireupAction,
	resource: wireupResource,
	start: start
};

function buildUrl() {
	var idx = 0,
		cleaned = [],
		segment;
	while( idx < arguments.length ) {
		segment = arguments[ idx ];
		if( segment.substr( 0, 1 ) === '/' ) {
			segment = segment.substr( 1 );
		}
		if( segment.substr( segment.length-1, 1 ) === '/' ) {
			segment = segment.substring( 0, segment.length - 1 );
		}
		if( !_.isEmpty( segment ) ) {
			cleaned.push( segment );
		}
		idx ++;
	}
	return '/' + cleaned.join( '/' );
}

function buildActionUrl( resourceName, action ) {
	return action.url || buildUrl( ( config.apiPrefix || 'api' ), resourceName, ( action.path || '' ) );
}

function buildActionAlias( resourceName, action ) {
	return [ resourceName, action.alias ].join( '.' );
}

function buildPath( pathSpec ) {
	var hasLocalPrefix;
	pathSpec = pathSpec || '';
	if( _.isArray( pathSpec ) ) {
		hasLocalPrefix = pathSpec[0].match( /^[.]\// );
		pathSpec = path.join.apply( {}, pathSpec );
	}
	pathSpec = pathSpec.replace( /^~/, process.env.HOME );
	return hasLocalPrefix ? './' + pathSpec : pathSpec;
}

function checkPermissionFor( user, action ) {
	return authStrategy.authorizer.checkPermission( user, action )
		.then( null, function() {
			return true;
		} )
		.then( function( granted ) {
			return granted;
		} );
}

function start() {
	http.start( authStrategy );
}

function wireupResource( resource, basePath ) {
	var meta = { routes: {} };
	if( resource.resources && resource.resources != '' ) {
		var directory = buildPath( [ basePath, resource.resources ] );
		http.static( '/' + resource.name, directory );
		meta.path = { url: '/' + resource.name, directory: directory };
	}
	_.each( resource.actions, function( action ) {
		wireupAction( resource, action, meta );
	} );
	return meta;
}

function wireupAction( resource, action, meta ) {
	var url = buildActionUrl( resource.name, action ),
		alias = buildActionAlias( resource.name, action );
	meta.routes[ action.alias ] = { verb: action.verb, url: url };
	http.route( url, action.verb, function( req, res ) {
		var respond = function() {
			var envelope = new HttpEnvelope( req, res );
			action.handle.apply( resource, [ envelope ] );
		};
		if( authStrategy ) {
			checkPermissionFor( req.user, alias )
				.then( function( pass ) {
					if( pass ) {
						respond();
					} else {
						res.status( 403 ).send( "User lacks sufficient permissions" );
					}
				} );
		} else {
			respond();
		}
	} );
}

module.exports = function( cfg, auth, httpLib, req, meter ) {
	config = cfg;
	authStrategy = auth;
	http = httpLib;
	metrics = meter;
	HttpEnvelope = require( './httpEnvelope.js' )( req );
	return wrapper;
};