const test = [{
	block: '1231231',
	section: 1,
	number: 0,
	track: 100
}, {
	block: '2342342',
	section: 1,
	number: 1,
	track: 100
}, {
	block: '3453453',
	section: 2,
	number: 0,
	track: 0
}
];

/*
var blocksOnTrack = test.reduce((blocksOnTrack, val) => {
	return val.track === 100 ? blocksOnTrack: blocksOnTrack + val.track;
},0);
*/

var blocksOnTrack = test.reduce((blocksOnTrack, val) => {
	return blocksOnTrack + val.track / 100;
},0);



console.log(test[blocksOnTrack -1].block);
