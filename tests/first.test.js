const puppeteer = require('puppeteer');
let page, browser;
const width = 1440, height = 797;

beforeAll( async () => {
	browser = await puppeteer.launch({
		headless: false,
		slowMo: 80,
		args: [`--windows-size=${width},${height}`]
	});
	page = await browser.newPage();
	await page.setViewport({ width: width, height: height});
});

test('Revisar página de Conalep Virtual', async () => {
	//await page.setViewPort({ width,height});
	await page.goto('https://conalepvirtual-test.superatemexico.com'); // Abrir una página
	const text = await page.$eval('h4', el => el.innerHTML); // Buscamos un elemento en la página y nos traemos el texto "interno" (innerHTML)

	expect(text).toEqual('¿Por qué tomar un curso en línea?'); // En esta linea estamos diciendo que la prueba debe esperar
																		// Un texto "Blogster" (que es como viene en el ejemplo del video)

},30000);

afterAll(async () => {
	await browser.close();
})
