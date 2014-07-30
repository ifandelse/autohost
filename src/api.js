var _ = require( 'lodash' ),
	path = require( 'path' ),
	when = require('when'),
	nodeWhen = require( 'when/node' ),
	fs = require( 'fs' ),
	gaze = require( 'gaze' ),
	readDirectory = nodeWhen.lift( fs.readdir ),
	adapters = [],
	authorizer,
	fount;

function addAdapter( adapter ) {
	adapters.push( adapter );
}

function clearAdapters() {
	adapters = [];
}

function getResources( filePath ) {
	var list = [];
	if( fs.existsSync( filePath ) ) {
		return readDirectory( filePath )
			.then( function( contents ) {
				return _.map( contents, function( item ) {
					var resourcePath = path.join( filePath, item, 'resource.js' );
					if( fs.existsSync( resourcePath ) ) {
						return resourcePath;
					}
				}.bind( this ) );
			}.bind( this ) );	
	} else {
		return when( [] );
	}
}

function loadModule( resourcePath ) {
	try {
		var key = path.resolve( resourcePath );
		delete require.cache[ key ];
		var mod = require( resourcePath )( fount );
		if( mod && mod.name ) {
			return processResource( mod, path.dirname( resourcePath ) );
		} else {
			console.log( 'Skipping resource at', resourcePath, 'no valid metadata provided' );
			return when( [] );
		}
	} catch (err) {
		console.log( 'Error loading resource module at', resourcePath, 'with', err.stack );
		return when( [] );
	}
}

function loadResources( filePath ) {
	var resourcePath = path.resolve( process.cwd(), filePath );
	watch( resourcePath );
	return getResources( resourcePath )
		.then( function( list ) {
			return when.all( _.map( _.filter( list ), loadModule ) )
				.then( function( lists ) {
					return _.flatten( lists );
				} );
		} );
}

function loadSelf() {
	loadModule( path.resolve( __dirname, './_autohost/resource.js' ) )
}

function processResource( resource, basePath ) {
	return when.all( _.map( adapters, function( adapter ) {
		return when.try( adapter.resource, resource, basePath )
	} ) )
	.then( function() {
		return _.map( resource.actions, function( action ) {
			return { 
				name: [ resource.name, action.alias ].join( '.' ), 
				resource: resource.name 
			};
		} );
	} );
}

function start( resourcePath ) {
	return when.all( [
			loadResources( resourcePath ),
			processResource( require( './_autohost/resource.js' )( fount ), path.resolve( __dirname, './_autohost' ) )
		] )
		.then( function ( list ) {
			var actions = _.flatten( list );
			if( authorizer ) {
				authorizer.actionList( actions )
					.then( function() {
						startAdapters();
					} );
			} else {
				startAdapters();
			}
			return actions;
		} );
}

function startAdapters() {
	_.each( adapters, function( adapter ) {
		adapter.start();
	} );
}

function watch( filePath ) {
	if( !fs.existsSync( filePath ) )
		return;
	return gaze( path.join( filePath, '**/resource.js' ), function( err, watcher ) {
		this.on( 'changed', function( changed ) {
			console.log( 'Reloading changed resource', path.basename( path.dirname( changed ) ) );
			loadModule( changed );
		} );
	} );
}

module.exports = function() {
	return {
		addAdapter: addAdapter,
		clearAdapters: clearAdapters,
		loadResources: loadResources,
		start: start
	}
};