// Comprueba el motor REAL de la app: validador interno, copia empaquetada de los
// datos y selector de ampollas en todo su recorrido. Uso: npx tsx tests/validar_motor.ts
import { readFileSync } from 'node:fs';
import { defaultDataset } from '../src/data/defaultDataset';
import { validarFarmaco, recalcularPorAmpollas, maxAmpollas, tieneSelectorAmpollas, dosisAmLh, FACTOR } from '../src/utils/calc';
import { DrugDataset } from '../src/types';

const json: DrugDataset = JSON.parse(readFileSync(new URL('../public/farmacos.json', import.meta.url), 'utf8'));
const err: string[] = [];
if (JSON.stringify(json) !== JSON.stringify(defaultDataset)) err.push('defaultDataset.ts no coincide con farmacos.json (ejecuta "npm run sync")');

let combinaciones = 0;
for (const f of json.farmacos) {
  validarFarmaco(f, json.meta).forEach(m => err.push(`${f.id}: ${m}`));
  if (!tieneSelectorAmpollas(f)) continue;
  for (let n = 1; n <= maxAmpollas(f); n++) {
    const g = recalcularPorAmpollas(f, n);
    combinaciones++;
    const esperado = (n * f.dosisPorAmp! * FACTOR[f.unidadPorAmp || 'mg'][f.conc.unidad]) / f.volumenFinal;
    if (Math.abs(g.conc.valor - esperado) > 1e-9 * esperado) err.push(`${f.id} × ${n}: concentración ${g.conc.valor}, esperada ${esperado}`);
    if (g.volFarmaco > f.volumenFinal + 1e-9) err.push(`${f.id} × ${n}: ${g.volFarmaco} mL de fármaco no caben en ${f.volumenFinal} mL`);
    validarFarmaco(g, json.meta).forEach(m => err.push(`${f.id} × ${n}: ${m}`));
    for (const mo of g.modos || []) {
      const r = dosisAmLh(mo.max, mo.unidad, 70, g.conc, json.meta);
      if (!Number.isFinite(r) || r <= 0) err.push(`${f.id} × ${n}: ritmo no válido en ${mo.nombre}`);
    }
  }
}
console.log(`${json.farmacos.length} fármacos, ${combinaciones} combinaciones de ampollas comprobadas`);
err.forEach(m => console.log('  ERROR  ', m));
console.log(`${err.length} errores`);
process.exit(err.length ? 1 : 0);
