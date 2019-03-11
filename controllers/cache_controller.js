const cache 					= require('../src/cache'		);

module.exports = {
	async flushall(req,res) {
		await cache.flushall();
		res.status(200).json({
			'message': 'flush cache done'
		});
	}
};
