import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('docs/', root);
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
await cp(new URL('dist/', root), output, {recursive: true});
await writeFile(new URL('.nojekyll', output), '');
console.log('GitHub Pages site prepared in docs/');
