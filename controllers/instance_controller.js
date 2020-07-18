const Instance = require('../src/instances');
const StatusCodes = require('http-status-codes');

module.exports = {
	async create(req,res) {
		const key_user = res.locals.user;
		if(!key_user.roles.isAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes permisos'
			});
		}
		var instance = new Instance(Object.assign({},req.body));
		instance.mod = [{
			by: key_user.name,
			when: new Date(),
			what: 'Creación de instancia'
		}];
		await instance.save().catch(e => {
			console.log(e);
			return res.status(StatusCodes.INTERNAL_ERROR).json({
				message: 'Ocurrió un error al intentar guardar la instancia',
				error: e
			});
		});
		res.status(StatusCodes.OK).json(instance);
	}, //create

	async get(req,res) {
		const query = req.query.hostname ? {
			hostname: req.query.hostname
		} : {};
		const instance = await Instance.findOne(query)
			.select('-mod -perm -own -__v')
			.populate('orgUnit', 'name parent type')
			.populate('registerOrgUnit', 'name parent type')
			.catch(e=>{
				console.log(e);
				return res.status(StatusCodes.INTERNAL_ERROR).json({
					message: 'Ocurrió un error al intentar localizar la instancia',
					error: e
				});
			});
		if(!instance) {
			return res.status(StatusCodes.OK).json({
				message: 'No existe la instancia solicitada'
			});
		}
		res.status(StatusCodes.OK).json(instance);
	}, //get
	//
	async list(req,res) {
		const key_user = res.locals.user;
		if(!key_user.roles.isAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes permisos'
			});
		}
		const instances = await Instance.find({})
			.select('-mod -perm -own -__v')
			.catch(e=>{
				console.log(e);
				return res.status(StatusCodes.INTERNAL_ERROR).json({
					message: 'Ocurrió un error al intentar localizar las instancias',
					error: e
				});
			});
		if(instances.length === 0) {
			return res.status(StatusCodes.OK).json({
				message: 'No existen instancias'
			});
		}
		res.status(StatusCodes.OK).json(instances);
	} // list
};
