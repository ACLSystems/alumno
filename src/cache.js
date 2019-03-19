const redis = require('redis');
const keys = require('../config/keys');
const {promisify} = require('util');
const logger = require('../shared/winston-logger');
const version = require('../version/version');
const timeToLiveSessions = process.env.TTL_SESSIONS || 900;
const timeToLive = process.env.TTL || 900;

const options = {
	url: keys.redisUrl
};
const redisClient = redis.createClient(options);
redisClient.hget 			= promisify(redisClient.hget);
redisClient.hgetall 	= promisify(redisClient.hgetall);
redisClient.hmset 		= promisify(redisClient.hmset);
redisClient.set 			= promisify(redisClient.set);
redisClient.get 			= promisify(redisClient.get);
redisClient.lpush			= promisify(redisClient.lpush);
redisClient.lrange		= promisify(redisClient.lrange);
redisClient.flushall	= promisify(redisClient.flushall);
redisClient.expire		= promisify(redisClient.expire);
redisClient.keys			= promisify(redisClient.keys);

var message = '';

redisClient.on('connect', function() {
	message = 'Cache connection open successfully';
	logger.info(message);
	console.log(message); // eslint-disable-line
});

redisClient.on('ready', function() {
	message = 'Cache client ready';
	redisClient.set(version.app,version.version);
	logger.info(message);
	console.log(message); // eslint-disable-line
});

redisClient.on('error', function(err) {
	message = `Cache error connection - Errno: ${err.errno} syscall: ${err.syscall} host: ${err.address} port: ${err.port}` ;
	logger.error(message);
	console.log(message); // eslint-disable-line
});

process.on('SIGINT', function() {
	redisClient.end(function () {
		message = 'Cache connection disconnected through app termination';
		logger.info(message);
		console.log(message); // eslint-disable-line
	});
});

redisClient.ttlSessions = timeToLiveSessions;
redisClient.ttl = timeToLive;
module.exports = redisClient;
