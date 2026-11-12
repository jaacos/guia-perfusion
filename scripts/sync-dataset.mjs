// Genera src/data/defaultDataset.ts a partir de public/farmacos.json.
// Hay UNA sola fuente de datos (el JSON); la copia empaquetada se regenera
// sola antes de cada "dev" y "build", así que no pueden divergir.
import { readFileSync, writeFileSync } from 'node:fs';
const json = JSON.parse(readFileSync(new URL('../public/farmacos.json', import.meta.url), 'utf8'));
const ts = `// GENERADO AUTOMÁTICAMENTE desde public/farmacos.json — NO EDITAR A MANO.
// Edita public/farmacos.json y ejecuta "npm run sync".
import { DrugDataset } from '../types';

export const defaultDataset: DrugDataset = ${JSON.stringify(json, null, 2)};
`;
writeFileSync(new URL('../src/data/defaultDataset.ts', import.meta.url), ts);
console.log(`defaultDataset.ts regenerado: ${json.farmacos.length} fármacos, v${json.meta.version}`);
