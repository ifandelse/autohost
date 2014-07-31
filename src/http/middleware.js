var bodyParser = require( 'body-parser' ),
	cookieParser = require('cookie-parser'),
	multer = require( 'multer' ),
	session = require( 'express-session' );

module.exports = function( packages, middleware, config, metrics ) {
	
	// add a timer to track ALL requests
	middleware( '/', function( req, res, next ) {
		req.context = {};
		var timerKey = [ req.method.toUpperCase(), req.url, 'timer' ].join( ' ' );
		metrics.timer( timerKey ).start();
		res.on( 'finish', function() { 
			metrics.timer( timerKey ).record();
		} );
		next();
	} );

	// turn on cookies unless turned off by the consumer
	if( !config.noCookies ) {
		middleware( '/', cookieParser() );
	}

	// turn on body parser unless turned off by the consumer
	if( !config.noBody ) {
		middleware( '/', bodyParser.urlencoded( { extended: false } ) );
		middleware( '/', bodyParser.json() );
		middleware( '/', bodyParser.json( { type: 'application/vnd.api+json' } ) );
		middleware( '/', multer( {
			dest: config.tmp
		} ) );
	}

	// turn on sessions unless turned off by the consumer
	if( !config.noSession ) {
		middleware( '/', session( { 
			secret: config.sessionSecret || 'authostthing',
			saveUninitialized: true,
			resave: true
		} ) );
	}

	// turn on cross origin unless turned off by the consumer
	if( !config.noCrossOrigin ) {
		middleware( '/', function( req, res, next ) {
			res.header( 'Access-Control-Allow-Origin', '*' );
			res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
			next();
		} );
	}

};