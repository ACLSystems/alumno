module.exports = {
	confirm(req,res,next) {
		req.body.fatherName = req.body.fathername ? req.body.fathername : req.body.fatherName;
		req.body.motherName = req.body.mothername ? req.body.mothername : req.body.motherName;
		next();
	}
};
