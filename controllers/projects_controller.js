const Project = require('../src/projects');
const Err = require('../controllers/err500_controller');

module.exports = {

	create(req,res){
		const key_user = res.locals.user;
		var project = new Project({
			name: req.body.name,
			org: req.body.org,
			orgUnit: req.body.orgUnit,
			owner: req.body.owner
		});
		if(!project.org) {
			project.org = key_user.org._id;
		}
		project.save()
			.then(() => {
				res.status(200).json({
					'message': 'Proyecto creado'
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'project_controller','create -- Saving Project --');
			});
	}, // create

	list(req,res) {
		const key_user 	= res.locals.user;
		const all 			= req.query.all || false;
		delete req.query.all;
		if(!req.query.org && !key_user.roles.isAdmin){
			req.query.org = key_user.org._id;
		}
		if(req.query.projects) {
			req.query.projects = JSON.parse(req.query.projects);
			if(typeof req.query.projects.day === 'string') {
				req.query.projects.day = parseInt(req.query.projects.day);
			}
		}
		if(all) {
			if(!key_user.roles.isAdmin){
				delete req.query.orgUnit;
				delete req.query.name;
				delete req.query.projects;
				delete req.query.all;
			} else {
				req.query = {};
			}
		}
		Project.find(req.query)
			.populate([{
				path: 'org',
				select: 'name'
			},
			{
				path: 'orgUnit',
				select: 'name type'
			}
			])
			.then(pro => {
				if(pro && pro.length > 1) {
					res.status(200).json({
						'message': `Se encontraron ${pro.length} proyectos`,
						'proyectos': pro,
						'query': req.query
					});
				} else if(pro && pro.length === 1) {
					res.status(200).json({
						'message': 'Un solo proyecto localizado',
						'proyecto': pro,
						'query': req.query
					});
				} else {
					res.status(200).json({
						'message': 'No se encontraron proyectos',
						'query': req.query
					});
				}
			}).catch((err) => {
				Err.sendError(res,err,'projects_controller','create -- Saving project --');
			});
	}, // list

	my(req, res) {
		const key_user 	= res.locals.user;
		Project.find({$or: [{owner: key_user._id},{orgUnit: key_user.orgUnit._id}]})
			.populate('org', 'name')
			.populate('orgUnit', 'name parent type')
			.populate('owner', 'name person currentProject')
			.then(projects => {
				if(projects && Array.isArray(projects) && projects.length > 0) {
					res.status(200).json(projects);
				} else {
					res.status(404).json({
						'message': 'No tengo proyectos'
					});
				}
			}).catch((err) => {
				Err.sendError(res,err,'projects_controller','my -- finding projects --');
			});
	}, // my

	current(req,res) {
		const User = require('../src/users');
		const key_user 	= res.locals.user;
		User.findById(key_user._id)
			.then(user => {
				if(user) {
					user.currentProject = req.body.project;
					user.save().then(() => {
						res.status(201).json({
							'message': 'Proyecto actual guardado'
						});
					}).catch((err) => {
						Err.sendError(res,err,'projects_controller','current -- Saving User --');
					});
				} else {
					res.status(404).json({
						'message': 'No hay usuario!!!'
					});
				}
			}).catch((err) => {
				Err.sendError(res,err,'projects_controller','current -- finding projects --');
			});
	}
};
