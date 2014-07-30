var path = require( 'path' ),
	metrics = require( 'cluster-metrics' ),
	request = require( 'request' ).defaults( { jar: true } ),
	when = require( 'when' ),
	passportFn = require( './express/passport.js' ),
	httpFn = require( './express/http.js' ),
	httpAdapterFn = require( './express/adapter.js' ),
	api = require( './api.js' )(),
	config, http, passport, httpAdapter; 

var wrapper = {
	init: initialize,
	http: http
};

function initialize( cfg, authProvider ) {
	config = cfg;
	if( when.isPromiseLike( authProvider ) ) {
		authProvider
			.then( function( result ) {
				setup( result )
			} );
	} else {
		setup( authProvider );
	}
}

function setup( authProvider ) {
	http = httpFn( config, request, metrics );
	if( authProvider ) {
		passport = passportFn( config, authProvider );
	}
	httpAdapter = httpAdapterFn( config, authProvider, http, request, metrics );
	api.addAdapter( httpAdapter );
	api.start( config.resources || path.join( process.cwd(), './resources' ) );
}

module.exports = wrapper;