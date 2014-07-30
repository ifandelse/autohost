var host = require( '../src/index.js' );
var _ = require( 'lodash' );

host.init( {
		port: 4041,
		resources: './demo/resource',
		static: './demo/public',
		socketIO: true,
		websockets: true,
		origin: 'console'
	} );