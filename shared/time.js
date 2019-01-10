module.exports = {
	displayLocalTime(date,tz) {
		//const tz = 'America/Mexico_City';
		const optY = {
			timeZone : tz,
			year : 'numeric'
		};
		const optM = {
			timeZone : tz,
			month : '2-digit'
		};
		const optD = {
			timeZone : tz,
			day : '2-digit'
		};
		const optTZ = {
			timeZone : tz,
			timeZoneName : 'short'
		};

		const date1 = new Date(date);
		return {
			date: date1.toLocaleDateString('en-US', optY) + '-' +
			date1.toLocaleDateString('en-US', optM) + '-' +
			date1.toLocaleDateString('en-US', optD),
			tz: date1.toLocaleDateString('en-US', optTZ)
		};
	}
};
