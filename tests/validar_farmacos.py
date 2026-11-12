#!/usr/bin/env python3
"""Validación independiente de public/farmacos.json (no usa el código de la app).

Recalcula concentraciones, recetas y ritmos y sale con código 1 si algo no cuadra.
Uso:  python3 tests/validar_farmacos.py
"""
import json, re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((RAIZ / 'public' / 'farmacos.json').read_text(encoding='utf-8'))
META, L = D['meta'], D['farmacos']
A_UG = {'mg': 1000.0, 'µg': 1.0}
UNIDADES = {'mg', 'µg', 'UI'}
errores, avisos = [], []

def ml_h(dosis, unidad, kg, conc):
    p = unidad.split('/')
    assert len(p) in (2, 3) and p[0] in UNIDADES and p[-1] in ('min', 'h', 'día') and (len(p) == 2 or p[1] == 'kg'), unidad
    h = dosis * (kg if len(p) == 3 else 1) * {'min': 60, 'h': 1, 'día': 1 / 24}[p[-1]]
    if 'UI' in (p[0], conc['unidad']):
        assert p[0] == conc['unidad'], 'mezcla de UI con masa'
        return h / conc['valor']
    return h * A_UG[p[0]] / (conc['valor'] * A_UG[conc['unidad']])

def masa(valor, unidad, destino):
    if 'UI' in (unidad, destino):
        assert unidad == destino, 'mezcla de UI con masa'
        return valor
    return valor * A_UG[unidad] / A_UG[destino]

for campo in ('version', 'fechaGeneracion', 'volumenEstandar', 'pesoMin', 'pesoMax', 'resolucionBomba'):
    if META.get(campo) in (None, ''): errores.append(f'meta: falta {campo}')
for lista, nombre in (([f['id'] for f in L], 'id'), ([f['principioActivo'] for f in L], 'principio activo (título)')):
    for x in set(lista):
        if lista.count(x) > 1: errores.append(f'{nombre} repetido: {x}')
if 'μ' in json.dumps(D, ensure_ascii=False): errores.append('hay una MU GRIEGA (U+03BC); usar el signo micro (U+00B5)')

for f in L:
    e = lambda m: errores.append(f"{f['id']}: {m}")
    try:
        conc = f['conc']
        if f.get('tipo') == 'gravedad':
            if not f.get('fases'): e('ficha por gravedad sin fases')
            for fa in f.get('fases', []):
                if min(fa['mgKg'], fa['suero'], fa['minutos']) <= 0: e(f"fase inválida: {fa['nombre']}")
            continue

        vol = f['volumenFinal']
        esperado = masa(f['dosisTotalNum'], f['dosisTotalUnidad'], conc['unidad']) / vol
        if abs(esperado - conc['valor']) > 1e-6 * max(1, esperado):
            e(f"concentración {conc['valor']} {conc['unidad']}/mL, pero {f['dosisTotalNum']} {f['dosisTotalUnidad']}/{vol} mL = {esperado:g}")

        # Selector de ampollas coherente con la preparación estándar
        if f.get('dosisPorAmp'):
            n = f.get('ampollasBase') or 1
            if abs(masa(n * f['dosisPorAmp'], f.get('unidadPorAmp') or 'mg', f['dosisTotalUnidad']) - f['dosisTotalNum']) > 1e-6:
                e(f"ampollasBase × dosisPorAmp ≠ dosisTotalNum ({n} × {f['dosisPorAmp']})")
            if not f.get('polvo') and abs(n * (f.get('volPorAmp') or 0) - f['volFarmaco']) > 1e-6:
                e(f"ampollasBase × volPorAmp ≠ volFarmaco ({n} × {f.get('volPorAmp')})")
        if f['volFarmaco'] > vol + 1e-9: e('el fármaco ocupa más que la jeringa')

        # Receta escrita: fármaco + diluyente = volumen final
        m = re.search(r'\+ ([\d.,]+) mL', f['dilucion'])
        if m:
            if '.' in m.group(1): e('decimal con punto en la receta (usar coma)')
            if abs(f['volFarmaco'] + float(m.group(1).replace(',', '.')) - vol) > 1e-6:
                e(f"la receta no suma {vol} mL ({f['volFarmaco']} + {m.group(1)})")

        for mo in f.get('modos') or []:
            if not 0 < mo['min'] <= mo['max']: e(f"rango inválido en modo {mo['nombre']}")
            for kg in (META['pesoMin'], 70, META['pesoMax']):
                lo, hi = ml_h(mo['min'], mo['unidad'], kg, conc), ml_h(mo['max'], mo['unidad'], kg, conc)
                if kg == 70 and lo < META['resolucionBomba']:
                    avisos.append(f"{f['id']} · {mo['nombre']} · 70 kg: ritmo mínimo {lo:.3f} mL/h, bajo la resolución de la bomba")
                if kg == 70 and hi > 200:
                    avisos.append(f"{f['id']} · {mo['nombre']} · 70 kg: ritmo máximo {hi:.0f} mL/h (jeringa agotada en {vol / hi * 60:.0f} min)")

        for b in f.get('boloModos') or []:
            if not b.get('conc', 0) > 0: e(f"bolo sin concentración: {b.get('label')}")
            if b.get('fijo') is None and (not b.get('porKg') or b.get('maxDosis') is None):
                e(f"bolo por peso sin porKg o sin dosis máxima: {b.get('label')}")
    except (KeyError, AssertionError, TypeError) as ex:
        e(f'dato incompleto o inválido ({ex})')

print(f"v{META['version']} · {len(L)} fármacos revisados")
for a in avisos: print('  AVISO  ', a)
for x in errores: print('  ERROR  ', x)
print(f'{len(errores)} errores, {len(avisos)} avisos')
sys.exit(1 if errores else 0)
