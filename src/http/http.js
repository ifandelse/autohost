var path = require( 'path' ),
	_ = require( 'lodash' ),
	parseUrl = require( 'parseurl' ),
	qs = require( 'qs' ),
	express = require( 'express' ),
	http = require( 'http' ),
	Router = express.Router,
	expreq = express.request,
	expres = express.response,
	queryparse = qs.parse,
	request, 
	config, 
	metrics,
	middlewareLib,
	middleware = [],
	routes = []
	paths = [];

var wrapper = {
	getMiddleware: createMiddlewareStack,
	getAuthMiddleware: createAuthMiddlewareStack,
	middleware: registerMiddleware,
	route: registerRoute,
	start: start,
	static: registerStaticPath,
	server: undefined,
	app: undefined,
	passport: undefined,
	stop: stop
};

function createMiddlewareStack() {
	var router = new Router();
	router
		.use( expressInit )
		.use( queryParser );
	_.each( middleware, function( m ) {
		m( router );
	} );
	return router;
}

function createAuthMiddlewareStack() {
	var router = new Router().use( expressInit );
	_.each( wrapper.passport.getMiddleware( '/' ), function( m ) {
		router.use( m.path, m.fn );
	} );
	return router;
}

function expressInit( req, res, next ) {
    // req.res = res;
    // res.req = req;
    req.next = next;
    req.__proto__ = expreq;
    res.__proto__ = expres;
    // res.locals = res.locals || Object.create(null);
    next();
}

function initialize( authStrategy ) {
	var cwd = process.cwd(),
		public = path.resolve( cwd, ( config.static || './public' ) );
	config.tmp = path.resolve( cwd, ( config.temp || './tmp' ) );

	registerStaticPath( '/', public );

	// prime middleware with defaults
	middlewareLib.attach( registerMiddleware );

	// if( authStrategy ) {
	wrapper.passport.wireupPassport( wrapper );
	//}

	// apply user-supplied middleware
	_.each( middleware, function( m ) { m( wrapper.app ); } );
	_.each( routes, function( r ) { r(); } );
	_.each( paths, function( p ) { p(); } );
}

function queryParser( req, res, next ) {
	if ( !req.query ) {
		var val = parseUrl( req ).query;
		req.query = queryparse( val );
	}
	next();
}

function registerMiddleware( filter, callback ) {
	middleware.push( function( target ) {
		target.use( filter, callback );
	} );
}

function registerRoute( url, verb, callback ) {
	verb = verb.toLowerCase();
	verb = verb == 'all' || verb == 'any' ? 'all' : verb;
	var errors = [ url, verb, 'errors' ].join( '.' );
	routes.push( function() {
		wrapper.app[ verb ]( url, function( req, res ) {
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
		wrapper.app.use( url, express[ 'static' ]( path.resolve( filePath ) ) );
	} );
}

function start( authStrategy ) {
	initialize( authStrategy );
	wrapper.server = http.createServer( wrapper.app );
	wrapper.server.listen( config.port || 8800 );
	console.log( 'autohost listening on port ', ( config.port || 8800 ) );
}

function stop() {
	wrapper.app._router = undefined;
	wrapper.server.close();
}

module.exports = function( cfg, req, pass, mw, metric ) {
	config = cfg;
	metrics = metric;
	request = req;
	wrapper.passport = pass;
	wrapper.app = express();
	middlewareLib = mw;
	return wrapper;
};