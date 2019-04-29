const Job = require('../src/jobs');
const Err = require('./err500_controller');

module.exports = {
	async create(req,res) {
		try {
			let jobFind = await Job.findOne({code:req.body.code, org: res.locals.user.org._id});
			if(jobFind) {
				res.status(409).json({
					'message': 'Warn: Job ' + jobFind.name +' ('+ jobFind.code +') already exists!'
				});
			} else {
				var job = new Job({
					code				: req.body.code,
					name				: req.body.name,
					cron				: req.body.cron,
					onTick			: req.body.onTick,
					onComplete	: req.body.onComplete,
					user				: res.locals.user._id,
					triggerType	: req.body.triggerType,
					dependsOn		: req.body.dependsOn,
					priority		: req.body.priority,
					beginDate		: req.body.beginDate,
					endDate			: req.body.endDate,
					tz					: req.body.tz,
					org					: res.locals.user.org._id,
					orgUnit			: res.locals.user.orgUnit._id,
					own					: {
						user			: res.locals.user.name,
						org				: res.locals.user.org.name,
						orgUnit		: res.locals.user.orgUnit.name
					},
					mod					: {
						by				: res.locals.user.name,
						what			: 'Job creation'
					}
				});
				job.save()
					.then(job => {
						res.status(200).json({
							'message': 'Job ' + job.name +' created sucessfully'
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'job_controller','create -- Saving job --');
					});
			}
		} catch (err) {
			Err.sendError(res,err,'job_controller','create -- Finding job --');
		}
	}, //create

	get(req,res) {
		Job.findOne({code:req.query.code})
			.then(job => {
				if(job){
					res.status(200).json(job.toJSON());
				} else {
					res.status(404).json({
						'message': 'Job ' + req.query.code + 'not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'job_controller','activate -- Finding job --');
			});
	}, //get

	activate(req,res){
		Job.findOne({code:req.query.code})
			.then(job => {
				if(job){
					job.status = 'active';
					job.save()
						.then(job => {
							res.status(200).json({
								'message': 'Job ' + job.name +'('+ job.code +') activated sucessfully'
							});
						})
						.catch((err) => {
							Err.sendError(res,err,'job_controller','create -- Saving job --');
						});
				} else {
					res.status(404).json({
						'message': 'Job not found'
					});
				}
			})
			.catch((err) => {
				Err.sendError(res,err,'job_controller','activate -- Finding job --');
			});
	} //activate
};
