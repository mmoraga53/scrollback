"use strict";

var express = require("express"),
	store = new express.session.MemoryStore(),
	signature = require("express/node_modules/cookie-signature"),
	cookie = require("cookie"),
	guid = require("../../lib/guid.js"),
	names = require("../../lib/names.js"),
	_get = store.get,
	key = "scrollback_sessid",
	secret = "ertyuidfghjcrtyujwsvokmdf",
	watchers = {};
	
function initUser() {
	return {
		id: 'guest-sb-' + names(6),
		picture: '/img/guest.png',
		accounts: [],
		rooms: {},
		newUser: true
	};
}

exports.get = function(user, cb) {
	unsign(user.sid, function(id, session) {
		if (session.user.newUser && user.suggestedNick) session.user.id="guest-"+user.suggestedNick;
		if (session.user.newUser ) delete session.user.newUser;
		store.set(id, session);
		cb(null, session);
	});
};
var set = exports.set = function(sid, sess, cb) {
	var i;
	unsign(sid, function(id) {
		store.set(id, sess);
		if(watchers[sid]) for(i in watchers[sid]) {
			watchers[sid][i](sess);
		}
	});
};

exports.watch = function(obj, cb) {
	if(!watchers[obj.sid]) watchers[obj.sid] = {};
	if(Object.keys(watchers[obj.sid]).length > 4)
		return;
	watchers[obj.sid][obj.cid] = cb;
	console.log(watchers);
}

exports.unwatch = function(obj) {
	if(watchers[obj.sid] && watchers[obj.sid][obj.cid])
		delete watchers[obj.sid][obj.cid];
}

var exparse = express.session({
	secret: secret,
	key: key,
	store: store
});

exports.store = store;

var parse = exports.parser = function(req, res, next) {
	exparse(req, res, function() {
		if(!req.session.user) {
			req.session.user = initUser();
			req.session.cookie.value = 's:' + signature.sign(req.sessionID, secret);
			store.set(req.sessionID, req.session);
		}
		next();
	});
};

function unsign(sid, cb) {
	var noop = function(){},
		fakeReq = {cookies: {}, signedCookies: {}, originalUrl: '/', on: noop, removeListener: noop},
		fakeRes = { on: noop };
	fakeReq.cookies[key] = sid;
	
	parse(fakeReq, fakeRes, function() {
		cb(fakeReq.sessionID, fakeReq.session);
	});
}

