const version = '1.17.0';

const year = new Date();

module.exports = {
	app: 'alumno',
	version: version,
	year: year.getFullYear(),
	vendor: 'ACL Systems SA de CV',
	numVersion: version.replace(/\./g, '')
	// se utiliza semver
};
