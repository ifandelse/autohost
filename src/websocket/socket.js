var clients = [],
	config, socketIO, websocket, http;
var wrapper = {
	add: addClient,
	clients: clients,
	identified: socketIdentified,
	notify: notifyClients,
	on: onTopic,
	remove: removeClient,
	send: sendToClient,
	start: start,
	topics: {}
};

wrapper.clients.lookup = {};

function addClient( socket ) {
	wrapper.clients.push( socket );
}

function socketIdentified( id, socket ) {
	wrapper.clients.lookup[ id ] = socket;
}

function notifyClients( message, data ) {
	_.each( wrapper.clients, function( client ) {
		client.publish( message, data );
	} );
}

function onTopic( topic, handle ) {
	wrapper.topics[ topic ] = handle;
}

function removeClient( socket ) {
	var index = wrapper.clients.indexOf( socket );
	if( index >= 0 ) {
		wrapper.clients.splice( index, 1 );
	}
	if( socket.id ) {
		delete wrapper.clients.lookup[ socket.id ];
	}
}

function sendToClient( id, message, data ) {
	var socket = wrapper.clients.lookup[ id ];
	if( !socket ) {
		socket = wrapper.clients.find( clients, function( client ) {
			return client.user.id == id || client.user.name == id;
		} );
	}
	if( socket ) {
		socket.publish( message, data );
		return true;
	} 
	return false;
}

function start( authStrategy ) {
	if( config.socketio || config.socketIO || config.socketIo ) {
		socketIO = require( './socketio.js' )( config, wrapper, authStrategy );
		socketIO.config( http );
	}
	if( config.websocket ) {
		websocket = require( './websocket' )( config, wrapper, authStrategy );
		websocket.config( http );
	}
}

module.exports = function( cfg, httpLib ) {
	config = cfg;
	http = httpLib;
	return wrapper;
};