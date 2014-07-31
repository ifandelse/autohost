var path = require( 'path' ),
	_ = require( 'lodash' ),
	express = require( 'express' ),
	http = require( 'http' ),
	request,
	app, 
	config, 
	metrics,
	passport,
	middleware = [],
	routes = []
	paths = [];

var wrapper = {
	middleware: registerMiddleware,
	route: registerRoute,
	start: start,
	static: registerStaticPath,
	server: undefined,
	stop: stop
};

function initialize( authStrategy ) {
	var cwd = process.cwd(),
		public = path.resolve( cwd, ( config.static || './public' ) );
	config.tmp = path.resolve( cwd, ( config.temp || './tmp' ) );

	registerStaticPath( '/', public );

	// prime middleware with defaults
	require( './middleware' )( express, registerMiddleware, config, metrics );

	if( authStrategy ) {
		passport.wireupPassport( wrapper );
	}

	// apply user-supplied middleware
	_.each( middleware, function( m ) { m(); } );
	_.each( routes, function( r ) { r(); } );
	_.each( paths, function( p ) { p(); } );
}

function registerMiddleware( filter, callback ) {
	middleware.push( function() {
		app.use( filter, callback );
	} );
}

function registerRoute( url, verb, callback ) {
	verb = verb.toLowerCase();
	verb = verb == 'all' || verb == 'any' ? 'all' : verb;
	var errors = [ url, verb, 'errors' ].join( '.' );
	routes.push( function() {
		app[ verb ]( url, function( req, res ) {
			try {
				callback( req, res );
			} catch ( err ) {
				metrics.meter( errors ).record();
				console.log( 'error on route, "' + url + '" verb "' + verb + '"', err.stack );
			}
		} );
	} );
}

function registerStaticPath( url, filePath ) {
	paths.push( function() {
		app.use( url, express[ 'static' ]( path.resolve( filePath ) ) );
	} );
}

function start( authStrategy ) {
	initialize( authStrategy );
	wrapper.server = http.createServer( app ).listen( config.port || 8800 );
	console.log( 'autohost listening on port ', ( config.port || 8800 ) );
}

function stop() {
	wrapper.server.close();
}

module.exports = function( cfg, req, pass, metric ) {
	config = cfg;
	metrics = metric;
	request = req;
	passport = pass;
	app = express();
	return wrapper;
};