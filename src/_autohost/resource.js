var fs = require( 'fs' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	util = require( 'util' ),
	os = require( 'os' );

module.exports = function( host, fount ) {
	return {
		name: '_autohost',
		resources: 'public',
		actions: [
			{
				alias: 'api',
				verb: 'get',
				topic: 'api',
				path: '',
				handle: function( envelope) {
					envelope.reply( { data: host.meta[ '_autohost' ].routes } );
				}
			},
			{
				alias: 'resources',
				verb: 'get',
				topic: 'resource.list',
				path: 'resource',
				handle: function( envelope ) {
					envelope.reply( { data: host.meta } );
				}
			},
			{
				alias: 'actions',
				verb: 'get',
				topic: 'actions.list',
				path: 'action',
				handle: function( envelope ) {
					// if( host.auth && host.auth.getActionList ) {
					// 	var pageSize = 20;
					// 	if (envelope.params.getAll) {
					// 		//this should really get all pages until done
					// 		//instead of hardcoding a ridicously large page size
					// 		pageSize = 16384;
					// 	}
					// 	host.auth.getActionList(pageSize)
					// 		.then( null, function( err ) {
					// 			console.log( err );
					// 		} )
					// 		.then( function ( list ) {
					// 			envelope.reply( { data: list } );
					// 		} );
					// } else {
					console.log( host );
					envelope.reply( { data: host.actions } );
					// }
				}
			},
			{
				alias: 'connected-sockets',
				verb: 'get',
				topic: 'socket.count',
				path: 'sockets',
				handle: function( envelope ) {
					envelope.reply( { data: { connected: host.socket.clients.length } } );
				}
			},
			{
				alias: 'list-users',
				verb: 'get',
				topic: 'user.list',
				path: 'user',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.getUserList ) {
						host.auth.authorizer.getUserList( 100 )
							.then( null, function( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} )
							.then( function( users ) {
								users = _.map( users, function( user ) {
									return _.omit( user, '_indices', 'pass', 'password' );
								} );
								envelope.reply( { data: users } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'list-roles',
				verb: 'get',
				topic: 'role.list',
				path: 'role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.getRoleList ) {
						host.auth.authorizer.getRoleList( 100 )
							.then( null, function( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} )
							.then( function( roles ) {
								envelope.reply( { data: roles } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'list-user-roles',
				verb: 'get',
				topic: 'user.role.list',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.getUserRoles ) {
						var user = envelope.data.user;
						host.auth.authorizer.getUserRoles( user )
						 	.then( null, function( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} )
							.then( function( roles ) {
								envelope.reply( { data: { user: user, roles: roles } } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'list-action-roles',
				verb: 'get',
				topic: 'action.role.list',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.getRolesFor ) {
						var action = envelope.data.action;
						host.auth.authorizer.getRolesFor( action )
							.then( null, function( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} )
							.then( function( roles ) {
								envelope.reply( { data: { action: action, roles: roles } } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'set-action-roles',
				verb: 'put',
				topic: 'set.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.setActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.auth.authorizer.setActionRoles( action, roles )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: "ok" } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'add-action-roles',
				verb: 'patch',
				topic: 'add.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.addActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.auth.authorizer.addActionRoles( action, roles )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: { result: "ok" } } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'remove-action-roles',
				verb: 'delete',
				topic: 'remove.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.removeActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.auth.authorizer.removeActionRoles( action, roles )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: { result: "ok" } } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'set-user-roles',
				verb: 'put',
				topic: 'set.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.setUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.auth.authorizer.setUserRoles( user, roles )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: { result: "ok" } } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'add-user-roles',
				verb: 'patch',
				topic: 'add.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.addUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.auth.authorizer.addUserRoles( user, roles )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: { result: "ok" } } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'remove-user-roles',
				verb: 'delete',
				topic: 'remove.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.removeUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.auth.authorizer.removeUserRoles( user, roles )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: "ok" } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'add-role',
				verb: 'post',
				topic: 'add.role',
				path: 'role/:role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.addRole ) {
						var role = envelope.data.role;
						host.auth.authorizer.addRole( role )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: "ok" } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'remove-role',
				verb: 'delete',
				topic: 'remove.role',
				path: 'role/:role',
				handle: function( envelope ) {
					if( host.auth && host.auth.authorizer.removeRole ) {
						var role = envelope.data.role;
						host.auth.authorizer.removeRole( role )
							.then( null, function( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: "ok" } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				'alias': 'create-user',
				'verb': 'post',
				'topic': 'create.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.auth && host.auth.authenticator.create ) {
						var user = envelope.data.userName,
							pass = envelope.data.password;
						host.auth.authenticator.create( user, pass )
							.then( null, function( err ) {
								envelope.reply( { data: { result: 'Could not create user "' + user + '"', error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: { result: 'User created successfully' } } );
							} );
					} else {
						envelope.reply( { data: { result: "Operation not supported by authentication provider" }, statusCode: 404 } );
					}
				}
			},
			{
				'alias': 'enable-user',
				'verb': 'put',
				'topic': 'enable.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.auth && host.auth.authenticator.enable ) {
						var user = envelope.data.userName;
						host.auth.authenticator.enable( user )
							.then( null, function( err ) {
								envelope.reply( { data: 'Could not enable user "' + user + '"', statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: 'User enabled successfully' } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authentication provider", statusCode: 404 } );
					}	
				}
			},
			{
				'alias': 'disable-user',
				'verb': 'delete',
				'topic': 'disable.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.auth && host.auth.authenticator.disable ) {
						var user = envelope.data.userName;
						host.auth.authenticator.disable( user )
							.then( null, function( err ) {
								envelope.reply( { data: 'Could not disable user "' + user + '"', statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: 'User disabled successfully' } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authentication provider", statusCode: 404 } );
					}
				}
			},
			{
				'alias': 'metrics',
				'verb': 'get',
				'topic': 'get.metrics',
				'path': 'metrics',
				handle: function( envelope ) {
					host.metrics.getMetrics( function( metrics ) {
						envelope.reply( { data: metrics } );
					} );
				}
			}
		]
	};
};