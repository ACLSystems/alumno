const Roster 				= require('../src/roster');
const Coupon				= require('../src/coupons');
const CouponNumber	= require('../src/couponNumbers')
const OrgUnit 			= require('../src/orgUnits');
const StatusCodes		= require('http-status-codes');
const Err 					= require('./err500_controller');

module.exports = {
	async create(req,res) {
		const key_user = res.locals.user;
		if(!checkPriviledges(res.locals.user)) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		var coupon = new Coupon({
			code: req.body.code,
			discount: +req.body.discount,
			status: req.body.status || 'draft',
			beginDate: new Date(req.body.beginDate),
			endDate: new Date(req.body.endDate),
			mod: [{
				by: key_user.name,
				when: new Date(),
				what: 'Creación de cupón'
			}]
		});
		var query = {
			code: req.body.code
		};
		if(key_user.roles.isAdmin) {
			if(req.body.orgUnit) {
				coupon.orgUnit = req.body.orgUnit;
				query.orgUnit = req.body.orgUnit;
			} else {
				query.orgUnit = {$exists:false};
			}
		} else {
			query.orgUnit = coupon.orgUnit;
		}
		if(req.body.item && req.body.onModel) {
			coupon.item = req.body.item;
			coupon.onModel = req.body.onModel;
			query.item = req.body.item;
			query.onModel = req.body.onModel;
		} else {
			query.item = {$exists: false};
		}
		console.log(query);
		const alreadySavedCoupon = await Coupon.findOne(query)
			.catch((err) => {
				console.log(err);
				Err.sendError(res,err,'coupon_controller','create -- Saving coupon --');
				return;
			});
		if(alreadySavedCoupon) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Este cupón ya existe'
			});
		}
		if(req.body.quantity) coupon.quantity = +req.body.quantity;
		await coupon.save().catch((err) => {
			console.log(err);
			Err.sendError(res,err,'coupon_controller','create -- Saving coupon --');
			return;
		});
		res.status(StatusCodes.OK).json({
			message: 'Cupón guardado'
		});
	}, //create

	async list(req,res) {
		if(!checkPriviledges(res.locals.user)) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		const coupons = await  Coupon.find({})
			.select('-__v -mod -org')
			.populate('item','code title name')
			.populate('orgUnit','name longName')
			.lean()
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','list - Finding Coupons --');
				return;
			});
		res.status(StatusCodes.OK).json(coupons);
	}, //list

	async modify(req,res) {
		const key_user = res.locals.user;
		if(!checkPriviledges(key_user)) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		var updates = Object.keys(req.body);
		if(updates.length === 0) {
			return res.status(StatusCodes.OK).json({
				message: 'Nada que modificar'
			});
		}
		updates = updates.filter(item => item !== '_id');
		updates = updates.filter(item => item !== 'history');
		const allowedUpdates = [
			'status',
			'code',
			'item',
			'onModel',
			'discount',
			'quantity',
			'beginDate',
			'endDate'
		];
		const isValidOperation = updates.every(update => allowedUpdates.includes(update));
		if(!isValidOperation) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: 'Existen modificaciones no permitidas'
			});
		}
		var coupon = await Coupon.findById(req.params.couponid)
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','modify - Finding Coupon --');
				return;
			});
		if(!coupon) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Cupón ${req.params.couponid} no encontrado`
			});
		}
		coupon = Object.assign(coupon,req.body);
		coupon.mod.push({
			by: key_user.name,
			when: new Date(),
			what: 'Modificación de cupón'
		});
		coupon.status = 'draft';
		await coupon.save()
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','modify - Saving Coupon --');
				return;
			});
		var couponToSend = coupon.toObject();
		delete couponToSend.mod;
		delete couponToSend.__v;
		res.status(StatusCodes.OK).json(couponToSend);
	}, //modify

	async start(req,res) {
		const key_user = res.locals.user;
		if(!checkPriviledges(key_user)) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		var updates = Object.keys(req.body);
		if(updates.length === 0) {
			return res.status(StatusCodes.OK).json({
				message: 'Nada que modificar'
			});
		}
		var coupon = await Coupon.findById(req.params.couponid)
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','start - Finding Coupon --');
				return;
			});
		if(!coupon) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Cupón ${req.params.couponid} no encontrado`
			});
		}
		if(coupon.status !== 'draft') {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Cupón ${req.params.couponid} debe estar en status 'draft' antes de iniciar`
			});
		}
		await CouponNumber.counterReset('number',{coupon: coupon._id})
			.catch(err => {
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					message: `Cupón ${req.params.couponid} no puede inicializar`,
					err: err
				});
			});
		coupon.status = 'current';
		await coupon.save()
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','start - Saving Coupon --');
				return;
			});
		const couponToSend = coupon.toObject();
		delete couponToSend.mod;
		delete couponToSend.__v;
		res.status(StatusCodes.OK).json(couponToSend);
	}, // set

	async get(req,res) {
		const key_user = res.locals.user;
		var orgUnit = key_user.orgUnit.level === 2 ? key_user.orgUnit._id : await OrgUnit.findOne({name:key_user.orgUnit.parent})
			.lean()
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','get - Searching Coupon --');
				return;
			});
		if(!orgUnit) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'No se encontró la OU'
			});
		}
		if(key_user.orgUnit.level === 3) {
			orgUnit = orgUnit._id;
		}
		const coupon = Coupon.findOne({code:req.body.code,orgUnit:orgUnit})
			.lean()
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','get - Searching Coupon --');
				return;
			});
		if(!coupon) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'No se encontró cupón con la clave proporcionada'
			});
		}
		if(coupon.status && coupon.status !== 'current') {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Cupón con clave: ${coupon.code} no está vigente`
			});
		}
		const now = new Date();
		if(coupon.beginDate > now) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Cupón con clave: ${coupon.code} no está vigente`
			});
		}
		if(coupon.endDate < now) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Cupón con clave: ${coupon.code} no está vigente`
			});
		}
		if(coupon.item && coupon.onModel) {
			if(coupon.item !== req.body.groupid && coupon.item !== req.body.courseid) {
				return res.status(StatusCodes.NOT_FOUND).json({
					message: `Cupón con clave: ${coupon.code} no aplica para este curso/grupo`
				});
			}
		}

		const roster = await Roster.findById(req.params.rosterid)
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','get - finding Roster --');
				return;
			});
		if(!roster) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'ID de roster no es válido'
			});
		}
		var couponNumber = new CouponNumber({
			coupon: coupon.id
		});
		await couponNumber.save()
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','get - Saving CouponNumber --');
				return;
			});
		if(coupon.quantity < couponNumber.number) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'No hay cupones disponibles'
			});
		}
		roster.coupon = coupon._id;
		roster.couponNumber = couponNumber._id;
		await roster.save()
			.catch((err) => {
				Err.sendError(res,err,'coupon_controller','get - Saving Roster --');
				return;
			});
		res.status(StatusCodes.OK).json({
			couponCode: coupon.code,
			discount: coupon.discount,
			validUntil: coupon.endDate,
			couponNumber: couponNumber.number
		});
	}, //get
};

// private Functions

function checkPriviledges(user) {
	const {
		isRequester,
		isAdmin
	} = user.roles;
	if(!isAdmin && !isRequester) {
		return false;
	}
	return true;
}
