#!/usr/bin/env python3
"""Validación automática de farmacos.json.

Recalcula, con una implementación independiente de la de la app, todas las
concentraciones y ritmos, y falla (código de salida 1) si algo no cuadra.
Uso:  python3 tests/validar_farmacos.py
"""
import json, re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
L = json.loads((RAIZ / 'farmacos.json').read_text(encoding='utf-8'))
VOL = 50.0
A_UG = {'mg': 1000.0, 'µg': 1.0}
UNIDADES_OK = {'mg/kg/h', 'µg/kg/h', 'µg/kg/min', 'mg/kg/día', 'mg/min', 'µg/min', 'mg/h', 'µg/h', 'UI/h', 'UI/min'}
errores, avisos = [], []

def num(txt):
    return float(txt.replace('.', '').replace(',', '.'))

def ml_h(dosis, unidad, kg, conc):
    partes = unidad.split('/')
    por_hora = dosis * (kg if 'kg' in partes else 1)
    if partes[-1] == 'min': por_hora *= 60
    if partes[-1] == 'día': por_hora /= 24
    u = partes[0]
    if u == 'UI' or conc['unidad'] == 'UI':
        assert u == conc['unidad'] == 'UI', 'mezcla de UI con masa'
        return por_hora / conc['valor']
    return por_hora * A_UG[u] / (conc['valor'] * A_UG[conc['unidad']])

ids = [f['id'] for f in L]
for i in set(ids):
    if ids.count(i) > 1: errores.append(f'id duplicado: {i}')
nombres = [f['principioActivo'] for f in L]
for n in set(nombres):
    if nombres.count(n) > 1: errores.append(f'principio activo repetido como título: {n}')

for f in L:
    e = lambda m: errores.append(f"{f['id']}: {m}")
    for campo in ('id', 'nombreComercial', 'principioActivo', 'categoria', 'presentacion', 'dilucion', 'conc', 'concTexto', 'modos'):
        if f.get(campo) in (None, ''): e(f'falta el campo {campo}')
    conc = f['conc']

    # 1. Concentración declarada = dosis total / 50 mL
    if f.get('dosisTotal'):
        m = re.fullmatch(r'([\d.,]+) (mg|µg|UI)', f['dosisTotal'])
        if not m: e(f"dosisTotal ilegible: {f['dosisTotal']}"); continue
        total, u = num(m.group(1)), m.group(2)
        esperado = total / VOL
        if u != 'UI': esperado = esperado * A_UG[u] / A_UG[conc['unidad']]
        elif conc['unidad'] != 'UI': e('dosis en UI pero concentración en masa')
        if abs(esperado - conc['valor']) > 1e-6 * max(1, esperado):
            e(f"concentración {conc['valor']} {conc['unidad']}/mL, pero {f['dosisTotal']}/50 mL = {esperado:g}")
        if f['dosisTotal'].split()[0] not in f['dilucion']:
            e('la dosis total no aparece en el texto de preparación')
    elif not f.get('puro'):
        e('ni dosisTotal ni puro')

    # 2. Receta: volumen de fármaco + diluyente = 50 mL
    m = re.search(r'\+ ([\d.,]+) mL', f['dilucion'])
    if m and f.get('volFarmaco') is not None:
        if '.' in m.group(1): e('decimal con punto en la receta (usar coma)')
        if abs(f['volFarmaco'] + float(m.group(1).replace(',', '.')) - VOL) > 1e-6:
            e(f"volúmenes de la receta no suman 50 mL ({f['volFarmaco']} + {m.group(1)})")
    if f.get('dosisTotal') and '50 mL' not in f['dilucion']: e('la receta no indica el volumen final')

    # 3. El texto de concentración contiene el valor numérico
    v = f"{conc['valor']:g}".replace('.', ',')
    if v not in f['concTexto'].replace('.', ''): e(f"concTexto «{f['concTexto']}» no contiene {v}")

    # 4. Modos de perfusión
    for mo in f['modos']:
        if mo['unidad'] not in UNIDADES_OK: e(f"unidad no soportada: {mo['unidad']}"); continue
        if mo['min'] > mo['max'] or mo['min'] <= 0: e(f"rango inválido en modo {mo['nombre']}")
        for kg in (40, 70, 120):
            lo, hi = ml_h(mo['min'], mo['unidad'], kg, conc), ml_h(mo['max'], mo['unidad'], kg, conc)
            if lo < 0.1: avisos.append(f"{f['id']} · {mo['nombre']} · {kg} kg: ritmo mínimo {lo:.2f} mL/h (<0,1: poco preciso en perfusor)")
            if hi > 200: avisos.append(f"{f['id']} · {mo['nombre']} · {kg} kg: ritmo máximo {hi:.0f} mL/h (jeringa agotada en {50/hi*60:.0f} min)")

    # 5. Bolos y fases por gravedad
    for b in f.get('boloModos', []):
        if sum(k in b for k in ('mgFijo', 'mgKg', 'uiKg')) != 1 or not b.get('conc'): e(f"bolo mal definido: {b.get('label')}")
    if f.get('tipo') == 'gravedad':
        if not f.get('fases'): e('ficha por gravedad sin fases')
        for fa in f.get('fases', []):
            if min(fa['mgKg'], fa['suero'], fa['minutos']) <= 0: e(f"fase inválida: {fa['nombre']}")

print(f'{len(L)} fármacos revisados')
for a in avisos: print('  AVISO  ', a)
for x in errores: print('  ERROR  ', x)
print(f'{len(errores)} errores, {len(avisos)} avisos')
sys.exit(1 if errores else 0)
