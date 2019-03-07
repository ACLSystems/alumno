var date = new Date();
var options = { year: 'numeric', month: 'long', day: 'numeric', timezone: 'America/Mexico_City' };

console.log(date.toLocaleDateString('es-ES', options));
