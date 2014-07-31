var SocketStream = require( './socketStream.js' );

function SocketEnvelope( message, socket ) {
	this.transport = 'websocket';
	this.context = socket.context;
	this.data = message.data || message || {};
	this.cookies = socket.cookies;
	this.headers = socket.headers;
	this.user = socket.user;
	this.responseStream = new SocketStream( message.replyTo, socket );
	this._original = {
		message: message,
		socket: socket
	};

	for( var key in req.params ) {
		var val = req.params[ key ];
		if( !this.data[ key ] ) {
			this.data[ key ] = val;
		}
		this.params[ key ] = val;
	}
	for( var key in req.query ) {
		var val = req.query[ key ];
		if( !this.data[ key ] ) {
			this.data[ key ] = val;
		}
		this.params[ key ] = val;
	}
}

SocketEnvelope.prototype.forwardTo = function( options ) {
	throw new Error( 'Sockets do not presently support proxying via forwardTo' );
};

SocketEnvelope.prototype.reply = function( envelope ) {
	this._original.socket.publish( message.replyTo, envelope );
}

SocketEnvelope.prototype.replyWithFile = function( contentType, fileName, fileStream ) {
	this._original.socket.publish( { index: -1, fileName: filename, contentType: contentType } );
	fileStream.pipe( this.responseStream );
};

module.exports = SocketEnvelope;