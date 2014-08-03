var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	when = require( 'when' ),
	requestor = require( 'request' ).defaults( { jar: true } ),
	metrics = require( 'cluster-metrics' ),
	port = 88988,
	config = {
		port: port
	},
	actionRoles = {

	},
	authProvider = {
		authorizer: {
			checkPermission: function( user, action ) {
				var requiredRoles = actionRoles[ action ],
					authorized = requiredRoles.length === 0 || _.intersection( requiredRoles, user.roles ).length > 0;
				return when( authorized );
			}
		}
	},
	http = require( '../src/http/http.js' )( config, requestor, authProvider, metrics ),
	addRoles = function( action, roles ) {
		actionRoles[ action ] = roles;
	},
	httpAdapter = require( '../src/http/adapter.js' )( config, authProvider, http, requestor, metrics );

describe( 'with http module', function() {
	var userRoles = [],
		cleanup = function() {
			userRoles = [];
			actionRoles = {};
		};

	before( function() {
		http.middleware( '/', function( req, res, next ) {
			req.user = {
				roles: userRoles
			};
			next();
		} );
		httpAdapter.action( { name: 'test' }, {
			alias: 'call',
			verb: 'get',
			path: '/call/:one/:two',
			handle: function( env ) {
				envelope = env;
				env.reply( { data: 'ta-da!' } );
			}
		}, { routes: {} } );
		http.start();
	} );

	describe( 'when making a request with adequate permissions', function() {
		var result;

		before( function( done ) {
			addRoles( 'test.call', [ 'guest' ] );
			userRoles = [ 'guest' ];
			requestor.get( {
				url: 'http://localhost:88988/api/test/call/10/20' 
			}, function( err, resp ) {
				result = resp.body;
				done();
			} );
		} );

		it( 'should return file contents', function() {
			result.should.equal( 'ta-da!' );
		} );

		after( cleanup );
	} );

	describe( 'when making a request with inadequate permissions', function() {
		var result;

		before( function( done ) {
			addRoles( 'test.call', [ 'admin' ] );
			userRoles = [ 'guest' ];
			requestor.get( {
				url: 'http://localhost:88988/api/test/call/10/20' 
			}, function( err, resp ) {
				result = resp;
				done();
			} );
		} );

		it( 'should return file contents', function() {
			result.body.should.equal( 'User lacks sufficient permissions' );
		} );

		it( 'should return correct status code', function() {
			result.statusCode.should.equal( 403 );
		} );

		after( cleanup );
	} );

	after( http.stop );
} );