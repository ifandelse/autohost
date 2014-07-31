var _ = require( 'lodash' ),
	when = require( 'when' ),
	passport = require( 'passport' ),
	metrics;

var noOp = function() { return when( true ); },
	userCountCheck = noOp,
	unauthCount = 'autohost.unauthorized.count',
	unauthRate = 'autohost.unauthorized.rate',
	authorizationErrorCount = 'autohost.authorization.errors',
	authorizationErrorRate = 'autohost.authorization.error.rate',
	authenticationTimer = 'autohost.authentication.timer',
	authorizationTimer = 'autohost.authorization.timer',
	authenticationStrategy,
	authenticationVerifier,
	authenticationStrategy,
	authenticationStrategyProperties,
	anonPaths,
	authenticator, authorizer, metrics;

function addPassport( http ) {
	http.middleware( '/', passport.initialize() );
	http.middleware( '/', passport.session() );
	_.each( anonPaths, function( pattern ) {
		http.route( pattern, 'all', skipAuthentication );
	} );
	// http.route( '*', 'all', whenNoUsers );
	// http.route( '*', 'all', skipConditionally );
	// http.route( '*', 'all', getRoles );
	http.middleware( '/', whenNoUsers );
	http.middleware( '/', skipConditionally );
	http.middleware( '/', getRoles );

	passport.serializeUser( function( user, done ) {
		done( null, user );
	} );
	passport.deserializeUser( function( user, done ) {
		done( null, user );
	} );
}

function checkPermission( user, action ) {
	return authenticator.checkPermission( user, action );
}

function getRoles( req, res, next ) {
	metrics.timer( authorizationTimer ).start();
	authorizer.getUserRoles( req.user.name )
		.then( null, function( err ) {
			metrics.counter( authorizationErrorCount ).incr();
			metrics.meter( authorizationErrorRate ).record();
			metrics.timer( authorizationTimer ).start();
			res.status( 500 ).send( 'Could not determine user permissions' );
		} )
		.then( function( roles ) {
			req.user.roles = roles;
			next();
		} );
}

function getSocketAuthenticationStrategy( success, fail ) {
	var strategy = Object.create( authenticationStrategy );
	_.each( authenticationStrategyProperties, function( value, key ) {
		strategy[ key ] = value;
	} );
	strategy.fail = fail;
	strategy.success = success;
	return strategy;
}

function getSocketRoles( userName ) {
	metrics.timer( authorizationTimer ).start();
	authorizer.getUserRoles( userName )
		.then( null, function( err ) {
			metrics.counter( authorizationErrorCount ).incr();
			metrics.meter( authorizationErrorRate ).record();
			metrics.timer( authorizationTimer ).start();
			return [];
		} )
		.then( function( roles ) {
			return roles;
		} );
}

function skipAuthentication( req, res, next ) {
	req.skipAuth = true;
	req.user = {
		id: 'anonymous',
		name: 'anonymous'
	}
	next();
}

function skipConditionally( req, res, next ) {
	if( req.skipAuth ) {
		next();
	} else {
		metrics.timer( authenticationTimer ).start();
		authenticate( req, res, next );
		metrics.timer( authenticationTimer ).record();
	}
}

function whenNoUsers( req, res, next ) {
	userCountCheck()
		.then( function( hasUsers ) {
			if( hasUsers ) {
				userCountCheck = noOp;
				next();
			} else {
				skipAuthentication( req, res, next );
			}
		} );
}

function withAuthLib( authProvider ) {
	var strategy = authProvider.passport;
	authenticationStrategy = strategy.constructor.prototype;
	var properties = {};
	_.each( strategy, function( value, key ) { 
		properties[ key ] = value;
	} );
	authenticationStrategyProperties = properties;
	passport.use( strategy );
	authenticate = authProvider.authenticate;
	authorizer = authProvider.authorizer;
	authenticator = authProvider.authenticator;
	if( authProvider.hasUsers ) {
		userCountCheck = authProvider.hasUsers;
	}
}

module.exports = function( config, authProvider, meter ) {
	metrics = meter;
	if( config.anonymous ) {
		anonPaths = _.isArray( config.anonymous ) ? config.anonymous : [ config.anonymous ];
	} else {
		anonPaths = [];
	}
	withAuthLib( authProvider );
	return {
		getSocketAuth: getSocketAuthenticationStrategy,
		getSocketRoles: getSocketRoles,
		wireupPassport: addPassport
	};
};