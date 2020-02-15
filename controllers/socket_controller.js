const StatusCodes 	= require('http-status-codes');
const redisClient = require('../src/cache');
const io = require('socket.io-emitter')(redisClient);
const Err 					= require('../controllers/err500_controller');


module.exports = {
	async sendMessage(req,res) {
		try {
			const allClients = await getAllClients();
			// console.log(allClients);
			const foundClient = allClients.findIndex(client => client.client == req.body.destination);
			if(foundClient > -1) {
				await io.to(req.body.destination).emit(req.body.destination,req.body.message);
				res.status(StatusCodes.OK).json({
					'message': 'Mensaje enviado'
				});
			} else {
				res.status(StatusCodes.OK).json({
					'message': `Destination - ${req.body.destination} - no está conectado`
				});
			}

		} catch (e) {
			Err.sendError(res,e,'socket_controller','sendMessage -- Sending message');
		}
	}
};


async function getAllClients() {
	var allClients = await redisClient.get('clients');
	if(allClients) {
		allClients = [...JSON.parse(allClients)];
	} else {
		allClients = [];
	}
	return allClients;
}
