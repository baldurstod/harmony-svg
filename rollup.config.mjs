import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import typescript from '@rollup/plugin-typescript';

const TEMP_BUILD = './dist/dts/index.js';

await convertSVG();

export default [
	{
		input: './build/ts/index.ts',
		output: {
			file: TEMP_BUILD,
			format: 'esm'
		},
		plugins: [
			typescript(),
			{
				name: 'postbuild-commands',
				closeBundle: async () => {
					await postBuildCommands()
				}
			},
		],
	},
];

async function postBuildCommands() {
	fs.copyFile(TEMP_BUILD, './dist/index.js', err => { if (err) throw err });
	return new Promise(resolve => child_process.exec(
		'api-extractor run --local --verbose --typescript-compiler-folder ./node_modules/typescript',
		(error, stdout, stderr) => {
			if (error) {
				console.log(error);
			}
			resolve("done")
		},
	));
}

async function convertSVG() {
	const inputDir = './src/svg/';
	const outputDir = './build/ts/';
	const filenames = await fs.promises.readdir(inputDir);
	const extension = '.svg';

	let index = '';

	for (let filename of filenames.filter(fn => fn.endsWith(extension))) {
		let name = path.parse(filename).name;
		let exportName = name.toLowerCase().replace(/[-_][a-z0-9]/g, (group) => group[1].toUpperCase());
		exportName += 'SVG';

		let file = await fs.promises.readFile(inputDir + filename);

		const decoder = new TextDecoder('utf-8');
		const uint8Array = new Uint8Array(file);
		const fileContent = decoder.decode(uint8Array);
		//console.log(fileContent);
		const tsContent = `export const ${exportName}: string = '${fileContent.slice(0, -1)}';`

		await fs.promises.writeFile(outputDir + name + '.ts', tsContent);

		index += `export { ${exportName} } from './${name}';\n`;
	}

	//console.log(index);
	await fs.promises.writeFile(outputDir + 'index.ts', index);
}
