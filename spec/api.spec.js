var should = require( 'should' ),
	fount = require( 'fount' ),
	_ = require( 'lodash' );

var getAdapter = function() {
	var fauxdapter = {
		resources: [],
		started: false,
		resource: function( resource ) {
			this.resources.push( resource );
		},
		start: function() {
			this.started = true;
		}
	};
	_.bindAll( fauxdapter );
	return fauxdapter;
};

describe( 'when loading from a bad path', function() {
	var result,
		api,
		adapter = getAdapter();

	before( function( done ) {
		api = require( '../src/api.js' )( fount );
		api.addAdapter( adapter );
		api.start( './spec/durp' )
			.then( null, function( err ) {
				return [];
			} )
			.then( function( list ) {
				result = list;
				done();
			} );
	} );

	it( 'should still load _autohost resource actions', function() {
		result.length.should.equal( 20 );
	} );

	after( function() {
		api.clearAdapters();
	} );
} );

describe( 'when loading from a good path', function() {
	var result,
		api,
		adapter = getAdapter();

	before( function( done ) {
		api = require( '../src/api.js' )( fount );
		api.addAdapter( adapter );
		api.start( './spec/resources' )
			.then( null, function( err ) {
				return [];
			} )
			.then( function( list ) {
				result = list;
				done();
			} );
	} );

	it( 'should load all resources and actions', function() {
		result.length.should.equal( 24 );
		result.should.eql( [
				{ name: 'one.a', resource: 'one' },
				{ name: 'one.b', resource: 'one' },
				{ name: 'two.a', resource: 'two' },
				{ name: 'two.b', resource: 'two' },
				{ name: '_autohost.api', resource: '_autohost' },
				{ name: '_autohost.resources', resource: '_autohost' },
				{ name: '_autohost.actions', resource: '_autohost' },
				{ name: '_autohost.connected-sockets', resource: '_autohost' },
				{ name: '_autohost.list-users', resource: '_autohost' },
				{ name: '_autohost.list-roles', resource: '_autohost' },
				{ name: '_autohost.list-user-roles', resource: '_autohost' },
				{ name: '_autohost.list-action-roles', resource: '_autohost' },
				{ name: '_autohost.set-action-roles', resource: '_autohost' },
				{ name: '_autohost.add-action-roles', resource: '_autohost' },
				{ name: '_autohost.remove-action-roles', resource: '_autohost' },
				{ name: '_autohost.set-user-roles', resource: '_autohost' },
				{ name: '_autohost.add-user-roles', resource: '_autohost' },
				{ name: '_autohost.remove-user-roles', resource: '_autohost' },
				{ name: '_autohost.add-role', resource: '_autohost' },
				{ name: '_autohost.remove-role', resource: '_autohost' },
				{ name: '_autohost.create-user', resource: '_autohost' },
				{ name: '_autohost.enable-user', resource: '_autohost' },
				{ name: '_autohost.disable-user', resource: '_autohost' },
				{ name: '_autohost.metrics', resource: '_autohost' }
			] );
	} );

	it( 'should start adapter', function() {
		adapter.started.should.be.true;
	} );

	after( function() {
		api.clearAdapters();
	} );
} );