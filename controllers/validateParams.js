

module.exports = function(req, res, next) {
	var url = req.url;
	const indexurl = url.indexOf('?');
	if(indexurl !== -1){
		url = url.substring(0,indexurl);
	}
	switch (url) {
	// RUTA PARA CODIGOS DE ERROR
	case '/api/errorcodes':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 51: Please, give data by query to process'
			});
		} else if (req.query.isNan()) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 52: Data given in errcode param is not a number'
			});
		} else {
			next();
		}
		break;

	// RUTAS PARA USUARIOS ---------------------------------------------------------USUARIOS
	case '/api/user/register':
		if(!req.body){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1700: Please, give data by body to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1701: Please give user name'
			});
		} else if (!req.body.org) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1702: Please give org'
			});
		} else if(!req.body.orgUnit){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1703: Please give orgUnit'
			});
		} else if(!req.body.password) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1704: Please give password for ' + req.body.name
			});
		} else if(!req.body.person){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1705: Please give person details for ' + req.body.name + '. If you send a JSON like { "person.name" : "myName" } , please re-write to  {"person": { "name": "myName"}} in order to process'
			});
		} else if(!req.body.person.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1706: Please give person name for ' + req.body.name
			});
		} else if(!req.body.person.fatherName) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1707: Please give person fatherName for ' + req.body.name
			});
		} else if(!req.body.person.motherName) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1708: Please give person motherName for ' + req.body.name
			});
		} else if(!req.body.person.email){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1709: Please give person email for ' + req.body.name
			});
		} else {
			next();
		}
		break;

	case '/api/v1/admin/user/register':
		if(!req.body){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1700: Please, give data by body to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1701: Please give user name'
			});
		} else if (!req.body.org) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1702: Please give org'
			});
		} else if(!req.body.orgUnit){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1703: Please give orgUnit'
			});
		} else if(!req.body.password) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1704: Please give password for ' + req.body.name
			});
		} else if(!req.body.person){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1705: Please give person details for ' + req.body.name + '. If you send a JSON like { "person.name" : "myName" } , please re-write to  {"person": { "name": "myName"}} in order to process'
			});
		} else if(!req.body.person.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1706: Please give person name for ' + req.body.name
			});
		} else if(!req.body.person.fatherName) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1707: Please give person fatherName for ' + req.body.name
			});
		} else if(!req.body.person.motherName) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1708: Please give person motherName for ' + req.body.name
			});
		} else if(!req.body.person.email){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1709: Please give person email for ' + req.body.name
			});
		} else {
			next();
		}
		break;

	case '/api/v1/admin/user/encrypt':
		if(!req.query){
			res.status(406).json({
				'status': 406,
				'message': 'Error 1700: Please, give data by query to process'
			});
		} else if(!req.query.user) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1701: Please give user'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/myroles':
		next();
		break;

	case '/api/user/confirm':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if(!req.query.email || !req.query.token) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1781: Please, give email and token to confirm'
			});
		} else {
			next();
		}
		break;

	case '/api/user/near':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1720: Please, give data by query to process'
			});
		} else if(!req.query.lng && !req.query.lat) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1721: Please, give coordinates (lng,lat) in query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/getdetails':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1730: Please, give data by query to process'
			});
		} else if(!req.query.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1731: Please, give user name by query or by header to process'
			});
		} else {
			next();
		}
		break;

	case '/api/user/validateemail':
		if(!req.query.email) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1740: Please, give user email to process'
			});
		} else {
			next();
		}
		break;

	case '/api/user/passwordrecovery':
		if(!req.body.email) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1740: Please, give user email to process'
			});
		} else if(!req.body.emailID) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1731: Please, give user name by query or by header to process'
			});
		} else if(!req.body.password) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1731: Please, give user name by query or by header to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/passwordchange':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1750: Please, give data by body to process'
			});
		} else if(!req.body.password) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1752: Please, give user password by body to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/user/modify':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1760: Please, give data by query to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1761: Please, give user name by query to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/admin/user/getroles':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1770: Please, give data by query to process'
			});
		} else if(!req.query.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1771: Please, give user name by query or by header to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/admin/user/setroles':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1781: Please, give user name by query or by header to process'
			});
		} else if(!req.body.roles) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1782: Please, give roles of user to set'
			});
		} else {
			const roles = Object.keys(req.body.roles);
			var message = '';
			roles.forEach(function(key) {
				if(key !== 'isAdmin' &&
				key !== 'isOrg' &&
				key !== 'isBusiness' &&
				key !== 'isOrgContent' &&
				key !== 'isAuthor' &&
				key !== 'isInstructor' &&
				key !== 'isSupervisor') {
					message = 'Error 1783: Please use only recognized roles';
				}
			});
			if (message !== '') {
				res.status(406).json({
					'status': 406,
					'message': message
				});
			} else {
				next();
			}
		}
		break;

	case '/api/v1/user/mygroups':
		next();
		break;

	case '/api/v1/user/mygroup':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if (!req.query.groupid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/createattempt':
		if(!req.body) { //PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by body to process'
			});
		} else if (!req.body.groupid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by body to process'
			});
		} else if (!req.body.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by body to process'
			});
		} else if (!req.body.answers) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give array with answers by body to process'
			});
		} else if (!req.body.grade) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give grade by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/testcreateattempt':
		if(!req.query) { //GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if (!req.query.userid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else if (!req.query.groupid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else if (!req.query.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/touchgrade':
		if(!req.query) { //GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if (!req.query.userid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else if (!req.query.groupid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else if (!req.query.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/mygrades':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if (!req.query.groupid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give group id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/course/getblocklist':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if (!req.query.code && !req.query.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give course code or course id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/course/list':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if (!req.query.org) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give org by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/nextblock':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1780: Please, give data by query to process'
			});
		} else if(!req.query.groupid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1781: Please, give groupid by query to process'
			});
		/*
		} else if(!req.query.courseid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1781: Please, give courseid by query to process'
			});
		*/
		} else if(!req.query.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1781: Please, give blockid by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/admin/user/validate':
		next();
		break;

	// RUTAS PARA ORGANIZACIONES -------------------------------------------------ORGANIZACIONES

	case '/api/v1/orgadm/user/massiveregister':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -1770: Please, give data by body to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/orgadm/orgunit/massiveregister':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1100: Please, give data by body to process'
			});
		} else {
			var status = 'ok';
			var result = new Array();
			req.body.forEach(function(ou,index) {
				if(!ou.name) {
					result.push({ 'status': index + 'Error 1101: Missing OU name'});
					status = 'not ok';
				}
				if(!ou.parent) {
					result.push({ 'status': index + 'Error 1102: Missing OU parent name'});
					status = 'not ok';
				}
				if(!ou.type) {
					result.push({ 'status': index + 'Error 1103: Missing OU type'});
					status = 'not ok';
				}
			});
			if(status === 'ok'){
				next();
			} else {
				res.status(406).json({
					'status': 406,
					'message': result
				});
			}
		}
		break;

	case '/api/v1/orgadm/orgunit/register':
		if(!req.body) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1110: Please, give data by body to process'
			});
		} else if(!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1111: Please, give user name by body to process'
			});
		} else if(!req.body.org) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1112: Please, give org name by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/orgadm/orgunit/list':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -1110: Please, give data by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/orgadm/user/list':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -1110: Please, give data by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/orgadm/user/count':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -1110: Please, give data by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/orgadm/org/getdetails':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -1110: Please, give data by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/orgadm/report/totalusers':
		next();
		break;

	case '/api/v1/orgadm/report/usersbyou':
		next();
		break;

	// RUTAS PARA UNIDADES ORGANIZACIONALES --------------------------------------UNIDADES ORGANIZACIONALES

	case '/api/orgunit/list':
		if(!req.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -1110: Please, give data by query to process'
			});
		} else {
			next();
		}
		break;

	// RUTAS PARA CONTENIDOS -----------------------------------------------------CONTENIDOS
	case '/api/v1/author/course/create':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error 1400: Please, give data by body to process'
			});
		} else if (!req.body.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1401: course code is required'
			});
		} else if (!req.body.title) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1402: course title is required'
			});
		} else if (!req.body.categories) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1403: course categories are required'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/course/listcategories':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1420: Please, give data by query params to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/course/listcourses':
		//var temp = {};
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1430: Please, give data by query params to process'
			});
		} else {
			next();
		}
		break;
	case '/api/v1/author/course/createblock':
		//var temp = {};
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error 1430: Please, give data by body to process'
			});
		} else if (!req.body.coursecode && !req.body.courseId) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1431: Please, give course code or course id to which block is related'
			});
		} else if (!req.body.title) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1432: Please, give title by body to process'
			});
		} else if (!req.body.type) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1433: Please, give block type by body to process'
			});
		} else if (req.body.type !== 'text' &&
				req.body.type !== 'textVideo' &&
				req.body.type !== 'video' &&
				req.body.type !== 'task' &&
				req.body.type !== 'questionnarie'
		) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1434: Block type must be one of the next strings: text, textVideo, video, task or questionnarie'
			});
		/*
		} else if (req.body.section === undefined) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1435: Please, give section number by body to process'
			});
		} else if (req.body.number === undefined) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1436: Please, give block number by body to process'
			});
		} else if (req.body.order === undefined) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1437: Please, give order number by body to process'
			});
		} else if (req.body.status && req.body.status !== 'draft' &&
								req.body.statys !== 'published') {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1438: Please, Block status must be one of the next strings: draft or published'
			});
		*/
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/modifyblock':
		if(!req.body) {  // PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error 1430: Please, give data by body to process'
			});
		} else if (!req.body.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1431: Please, give block id by body to process'
			});
		} else if (!req.body.block) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1432: Please, give fields inside block by body to process'
			});
		} else {
			next();
		}
		break;


	case '/api/v1/author/file/upload':
		if(!req.file) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error 1440: Please, give file to process'
			});
		} else if (!req.query.dir1) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1432: Please, give dir1 by query to process'
			});
		} else if (!req.query.dir2) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1432: Please, give dir2 by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/file/download':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1441: Please, give data by query to process'
			});
		} else if (!req.query.filename && !req.query.fileid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1442: Please, give fileid or filename by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/createresource':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error 1441: Please, give data by body to process'
			});
		} else if (!req.body.courseid && !req.body.coursecode) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1442: Please, give courseid or coursecode by body to process'
			});
		} else if (!req.body.title && !req.body.content) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1442: Please, give title and content by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/getresource':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1441: Please, give data by query to process'
			});
		} else if (!req.query.id && !req.query.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1442: Please, give course id or course code by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/modifyresource':
		if(!req.body) {  // PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error 1441: Please, give data by body to process'
			});
		} else if (!req.body.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1442: Please, give resource id by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/getblock':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1443: Please, give data by query to process'
			});
		} else if (!req.query.code && !req.query.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1444: Please, give block code (code) or block id (id)  by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/getblocklist':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1457: Please, give data by query to process'
			});
		} else if (!req.query.code && !req.query.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1458: Please, give course code or course id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/get':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1448: Please, give data by query to process'
			});
		} else if (!req.query.code && !req.query.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1449: Please, give course code by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/createquestionnarie':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error 1448: Please, give data by body to process'
			});
		} else if(!req.body.code && !req.body.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1449: Please, give course code or course id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/getquestionnarie':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1448: Please, give data by query to process'
			});
		} else if(!req.query.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1449: Please, give block id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/removequestionnarie':
		if(!req.body) {  // PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error 1448: Please, give data by query to process'
			});
		} else if(!req.body.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1449: Please, give block id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/addquestions':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error 1455: Please, give data by body to process'
			});
		} else if (!req.body.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give questionnarie id by body to process'
			});
		} else if(!req.body.questionnarie) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1466: Please, give questionnarie by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/createtasks':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error 1448: Please, give data by body to process'
			});
		} else if(!req.body.code && !req.body.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1449: Please, give course code or course id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/modify':
		if(!req.body) {  // PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error 1458: Please, give data by body to process'
			});
		} else if (!req.body.id) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1459: Please, give course id by body to process'
			});
		} else if (!req.body.course) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1460: Please, give JSON course by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/getblockby':
		if(!req.body) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1455: Please, give data by query to process'
			});
		} else if (!req.query.id && !req.query.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give course id or course code by query to process'
			});
		} else if (req.query.index && (req.query.section || req.query.number || req.query.order )) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1457: Please, choose one between index or section + number'
			});
		} else if (req.query.order && (req.query.index || req.query.section || req.query.number)) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1457: Please, choose one between index or section + number'
			});
		} else if (!req.query.index && (!req.query.section || !req.query.number) && !req.query.order) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1458: Please, choose one between index or section + number or order'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/moveblock':
		if(!req.body) {  // PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error 1455: Please, give data by body to process'
			});
		} else if (!req.body.courseid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give course id by body to process'
			});
		} else if (!req.body.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give block id to move by body to process'
			});
		} else if (!req.body.refblockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give reference block id to move or \'zero\' to move block to top by body to process'
			});
			/*
		} else if(req.body.refblockid === req.body.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: blockid and refblockid must be different. Move to the same place?'
			});
			*/
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/setblockorder':
		if(!req.body) {  // PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error 1455: Please, give data by body to process'
			});
		} else if (!req.body.blockid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give block id by body to process'
			});
		} else if (!req.body.section && ! req.body.number) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give section and number by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/author/course/makeavailable':
		if(!req.body) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error 1455: Please, give data by body to process'
			});
		} else if (!req.body.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error 1456: Please, give course code by body to process'
			});
		} else {
			next();
		}
		break;

	// RUTAS PARA GRUPOS ---------------------------------------------------------GRUPOS

	case '/api/v1/instructor/group/create':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else if (!req.body.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give group code by body to process'
			});
		} else if (!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give group name by body to process'
			});
		} else if (!req.body.course) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give course id by body to process'
			});
		} else if (req.body.endDate && !req.body.beginDate) {
			var endDate = Date.parse(req.body.endDate);
			var now = new Date();
			if(endDate <= now) {
				res.status(406).json({
					'status': 406,
					'message': 'Error -: endDate is past. Please use a future date or none'
				});
			} else {
				next();
			}
		} else if(req.body.beginDate && req.body.endDate) {
			var beginDate = Date.parse(req.body.beginDate);
			if(endDate <= beginDate) {
				res.status(406).json({
					'status': 406,
					'message': 'Error -: endDate is less than beginDate. Please use valid dates'
				});
			} else if (endDate <= now) {
				res.status(406).json({
					'status': 406,
					'message': 'Error -: endDate is past. Please use a future date or none'
				});
			} else {
				next();
			}
		} else {
			next();
		}
		break;

	case '/api/v1/instructor/group/list':
		next();
		break;

	case '/api/v1/instructor/group/createroster':
		if(!req.body) {  // PUT
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else if (!req.body.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give group code by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/instructor/group/listroster':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by query to process'
			});
		} else if (!req.query.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give group code by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/instructor/group/addstudent':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else if (!req.body.code) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give group code by body to process'
			});
		} else if (!req.body.student) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give student id by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/getresource':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by query to process'
			});
		} else if (!req.query.groupid) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give group id by query to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/instructor/group/userswogroup':
		next();
		break;

	// RUTAS PARA CARRERAS -------------------------------------------------------CARRERAS

	case '/api/v1/orgadm/career/create':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else if (!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give career name by body to process'
			});
		} else if (!req.body.longName) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give career long name by body to process'
			});
		} else if (!req.body.area) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give career area by body to process'
			});
		} else {
			next();
		}
		break;


	case '/api/v1/orgadm/career/massivecreate':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else {
			next();
		}
		break;

	// RUTAS PARA PERIODOS (TERMS) -----------------------------------------------TERMS

	case '/api/v1/orgadm/term/create':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else if (!req.body.name) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give term name by body to process'
			});
		} else if (!req.body.type) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give type term by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/orgadm/term/massivecreate':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else {
			next();
		}
		break;

	// RUTAS PARA COMENTARIOS (DISCUSSIONS) --------------------------------------DISCUSSIONS

	case '/api/v1/user/comment/create':
		if(!req.body) {  // POST
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by body to process'
			});
		} else if(!req.body.text) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give text comment by body to process'
			});
		} else if(!req.body.title && !req.body.discussion && !req.body.replyto) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give discussion title or discussion id or replyto by body to process'
			});
		} else {
			next();
		}
		break;

	case '/api/v1/user/comment/get':
		if(!req.query) {  // GET
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give data by query to process'
			});
		} else if (!req.query.query) {
			res.status(406).json({
				'status': 406,
				'message': 'Error -: Please, give query by query to process'
			});
		} else {
			next();
		}
		break;

	// NO HAY RUTAS --------------------------------------------------------------

	default:
		res.status(404).json({
			'status': 404,
			'message': 'Error 101: API not found'
		});
	}
};
