const test = [{
	block: '1231231',
	track: 100
}, {
	block: '2342342',
	track: 100
}, {
	block: '3453453',
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

console.log(blocksOnTrack);
