const User = require('../src/users');
const OrgUnit = require('../src/orgUnits');
const Err = require('../controllers/err500_controller');

module.exports = {

	totalUsers(req,res) {
		const key_user = res.locals.user;
		User.count({org: key_user.org})
			.then((count) => {
				res.status(200).json({
					'status'		: 200,
					'reportName': 'Total Org Users',
					'org'				: key_user.org.name,
					'totalUsers': count
				});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','totals -- Counting Users --');
			});

	}, //totalUsers

	usersByOrgUnit(req,res) {
		const key_user = res.locals.user;
		User.aggregate()
			.match({ org: key_user.org._id })
			.group({ _id: '$orgUnit', count:{$sum:1}})
			//.project({_id:0, 'orgUnit.name':1})
			.then((results) => {
				var ous = new Array();
				results.forEach(function(ou) {
					ous.push(ou._id);
				});
				var send_results = new Array();
				OrgUnit.find({ _id: {$in: ous}})
					.then((ous) => {
						results.forEach(function(rou) {
							var i = 0;
							var keep = true;
							while(i < ous.length && keep) {
								if(rou._id+'' === ous[i]._id+'') {
									send_results.push({
										name			: ous[i].name,
										longName	: ous[i].longName,
										parent		: ous[i].parent,
										count			: rou.count
									});
									keep = false;
								}
								i++;
							}
						});
						res.status(200).json({
							'status': 200,
							'reportName': 'Users by OrgUnit',
							'org'	: key_user.org.name,
							'data': send_results
						});
					})
					.catch((err) => {
						Err.sendError(res,err,'report_controller','byOrgUnit -- Finding OUs --');
					});
			})
			.catch((err) => {
				Err.sendError(res,err,'report_controller','byOrgUnit -- Counting Users --');
			});
	} //byOrgUnit

};
