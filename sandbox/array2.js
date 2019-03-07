var items = [
		{
		"id": 4,
		"reference": "DP-101",
		"description": "(DP-101) Acceso a curso de Desarrollo Profesional y Proyecto de Vida",
		"price": 10.34,
		"quantity": 10
	},
	{
	"id": 5,
	"reference": "DP-101",
	"description": "(DP-101) Acceso a curso de Desarrollo Profesional y Proyecto de Vida",
	"price": 10.34,
	"quantity": 10
	}
];

const tax = {
	id: 1,
	name: 'IVA',
	percentage: 16,
	description: 'Hola',
	status: 'active',
	type: 'IVA'
};

console.log(items.map(obj => {obj.tax = tax; return obj;}));
