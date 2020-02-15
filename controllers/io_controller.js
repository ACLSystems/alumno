const redis = require('redis');
const redisAdapter = require('socket.io-redis');
const url = require('../config/keys').redisUrl;
const User = require('../src/users');
const redisClient = require('../src/cache');

const pub = redis.createClient({url});
const sub = redis.createClient({url});
const defaultNamespace = 'init';

module.exports = async function(io) {
	await io.adapter(redisAdapter({ pubClient: pub, subClient: sub }));

	// Pase inicial validar conexiones
	var allClients = await redisClient.get('clients');
	if(allClients) {
		allClients = [...JSON.parse(allClients)];
	} else {
		allClients = [];
	}

	io.on('connection', async function(
		socket,
		namespace = defaultNamespace,
	) {
		allClients = await redisClient.get('clients');
		if(allClients) {
			allClients = [...JSON.parse(allClients)];
		} else {
			allClients = [];
		}
		// Nueva conexión
		socket.on(namespace, async (room) => {
			try {
				// Buscar usuario
				const user = await User.findById(room);
				if(!user) {
					io.emit(room, 'No user found');
				} else {
					// sockets activos del usuario. Los demás hay que quitarlos.
					var userSockets = [];
					// Buscar usuario en redis
					const foundIndex = allClients.findIndex(client => client.client+'' === room + '' || client.email === user.name);
					if(foundIndex > -1) {
						// Usuario sí está... buscar socket (lo más probable es que no esté y sea una reconexión)
						var foundSocket = allClients[foundIndex].sockets.find(socket => socket == socket.id);
						if(!foundSocket) {
							// No existe socket, ingresarlo al arreglo
							allClients[foundIndex].sockets.push(socket.id);
						}
						userSockets = allClients[foundIndex].sockets;
						// No existe usuario conectado
						for(var sock of userSockets) {
							var sockets = io.sockets.sockets;
							if(!(sockets[sock] && sockets[sock].connected)) {
								userSockets = userSockets.filter(item => item !== sock);
							}
						}
						allClients[foundIndex].sockets = [...userSockets];
					} else {
						allClients.push({
							sockets: [socket.id],
							client: room,
							email: user.name
						});
					}

					// Guardar en redis
					redisClient.set('clients',JSON.stringify(allClients));
					socket.join(room, () => {
						// let rooms = Object.keys(socket.rooms);
						// console.log('rooms: ',rooms);
						io.to(room).emit(room, {
							command: 'message',
							channel: room,
							message: 'Bienvenido ' + user.person.name
						});
					});
				}
			} catch (e) {
				console.log(e);
			}
		});

		socket.on('disconnect', async function() {
			// console.log('Disconnected: ', socket.id);
			allClients = await redisClient.get('clients');
			if(allClients) {
				allClients = JSON.parse(allClients);
				for(var i=0; i<allClients.length; i++) {
					var foundSocket = allClients[i].sockets.findIndex(sock => sock === socket.id);
					if(foundSocket > -1) {
						allClients[i].sockets.filter(sock => sock != socket.id);
						i = allClients.length;
						// console.log(`${socket.id} founded in allClients`);
					}
					i++;
				}
				redisClient.set('clients',JSON.stringify(allClients));
			}
		});
	});
};
