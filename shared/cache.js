const mongoose = require('mongoose');
const timeToLive = process.env.TTL || 600;
const redisClient = require('../src/cache');
const exec = mongoose.Query.prototype.exec;

// Creamos una función para acceder al cache
mongoose.Query.prototype.cache = function(options = {}) {
	this.useCache = true;
	this.hashKey = JSON.stringify(options.key || '');
	return this;
};

// Modificamos el exec de Mongoose.
// Ahora, cada vez que lancemos un query de Mongoose (en los finds)
// en lugar de ir primero a buscar a mongoDB vamos a redis
// siempre y cuando, esté activa la bandera useCache = true;
mongoose.Query.prototype.exec = async function() {
	// si no se usa cache, simplemente llamamos la función exec original.
	if(!this.useCache || !(redisClient.connected && redisClient.ready) ) {
		return exec.apply(this, arguments);
	}

	// Se construye la llave usando el nombre de la colección
	const key = JSON.stringify(
		Object.assign({}, this.getQuery(), {
			collection: this.mongooseCollection.name
		})
	);

	// Vemos si ya tenemos un valor para la llave (key)
	const cacheValue = await redisClient.hget(this.hashKey, key);

	// Si sí, regresamos ese valor
	if(cacheValue) {
		//console.log('CACHE op: ' + this.op);
		// Algunas operaciones de Mongoose no regresan
		// arreglos u objetos, sino un valor (como número o boleano)
		// por lo que debemos hacer unas excepciones para aquellas operaciones
		// de Mongoose de las que sabemos no regresan objetos y/o arreglos
		const exceptions = [
			'count',
			'countDocuments',
			'estimatedDocumentCount'
		];
		const resOp = exceptions.find( op => op === this.op);
		if(resOp) {
			return cacheValue;
		}
		const doc = JSON.parse(cacheValue);
		return Array.isArray(doc) // validar si lo que regresamos es un arreglo
			? doc.map(d => new this.model(d)) // y generar un arreglo con esto
			: new this.model(doc); // si no, solo manda el documento
	}
	// Si no, lanzamos el query a mongoDB y regresamos el resultado a redis
	//console.log('MONGO op: ' + this.op);
	const result = await exec.apply(this, arguments);
	redisClient.hset(this.hashKey, key, JSON.stringify(result));
	redisClient.expire(this.hashKey, timeToLive);

	return result;
};

module.exports = {
	// Módulo para eliminar la llave en redis
	clearHash(hashKey) {
		redisClient.del(JSON.stringify(hashKey));
	}
};
