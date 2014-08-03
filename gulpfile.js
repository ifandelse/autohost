var gulp = require( 'gulp' ),
	mocha = require( 'gulp-mocha' );

gulp.task( 'test', function() {
	gulp.src( [ './spec/websocket/*.spec.js', './spec/socketio/*.spec.js', './spec/**.spec.js' ] )
		.pipe( mocha( { reporter: 'spec' } ) )
		.on( 'error', function( err ) { console.log( err.message ); } );
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './src/**', './spec/**' ], [ 'test' ] );
} );

gulp.task( 'default', [ 'test', 'watch' ], function() {
} );