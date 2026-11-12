# Guía Rápida de Perfusión — Registro de correcciones

## v2.1.0-borrador (12/11/2026) — feedback de usuarios de prueba

**Todo lo clínico sigue pendiente de validación por Farmacia.**

- **Título por principio activo.** Fichas y orden por principio activo; el comercial pasa a secundario. La búsqueda sigue funcionando por ambos.
- **Chat de Gemini eliminado** (botón, panel, función `netlify/functions/gemini.js` y su configuración). La app ya no hace ninguna llamada externa.
- **Solo adulto.** La calculadora no calcula por debajo de 40 kg y remite a la guía pediátrica. El peso se conserva al cambiar de ficha y es único dentro de cada ficha (bolo y perfusión).
- **Duración de la jeringa** visible en todas las calculadoras de perfusión.
- **Versión y fecha de revisión de datos** visibles en la cabecera, más aviso de borrador.
- **Presentaciones.** Nuevo campo `otrasPresentaciones`; la ficha distingue la «presentación usada» en la receta. Midazolam: añadida la ampolla de 5 mg/5 mL.
- **Lidocaína:** receta explícita al 1 % y aviso para ampollas al 2 % y 5 %.
- **Furosemida:** se mantiene 100 mg/50 mL (dotación: solo ampollas de 20 mg). Aviso de que la jeringa hospitalaria habitual es de 250 mg/50 mL. Categoría «Diurético».
- **Amiodarona:** segundo modo «900 mg/24 h» (37,5 mg/h = 6,25 mL/h) con la misma jeringa.
- **Insulina:** «50 UI (0,5 mL del vial, con jeringa de insulina)», Actrapid / Humulina Regular, aviso «nunca NPH ni mezclas IV». Retirada la indicación de purgar 20 mL.
- **Esmolol:** eliminada la referencia a bomba volumétrica (no hay en la dotación).
- **Nuevos:** Somatostatina (3 mg/50 mL) y Acetilcisteína — Hidonac Antídoto, como ficha «por gravedad» con calculadora por fases (no cabe en jeringa de 50 mL).
- **Test automático** `tests/validar_farmacos.py`: recalcula concentraciones, recetas y ritmos de los 39 fármacos. Se ejecuta solo en GitHub en cada cambio (`.github/workflows/validar.yml`).

---

## v2.0.0 — revisión técnica

Revisión técnica del código y validación de cálculos de dosificación y dilución.
**Todo lo clínico de este documento requiere validación por Farmacia Hospitalaria / comisión correspondiente antes de uso asistencial oficial.**

---

## 1. Corrección de seguridad clínica más importante: ambigüedad en la dilución

**Problema.** Todas las concentraciones asumían volumen **final** de 50 mL, pero el texto decía *"1 amp (100 mg) **en** 50 mL"*. Interpretado como "añadir a 50 mL de suero", producía errores de concentración de hasta el 29 %:

| Fármaco | Vol. ampolla | Conc. si "hasta 50 mL" | Conc. si "añadir a 50 mL" | Error |
|---|---|---|---|---|
| Labetalol | 20 mL | 2 mg/mL | 1,43 mg/mL | **−29 %** |
| Dobutamina | 20 mL | 5 mg/mL | 3,57 mg/mL | **−29 %** |
| Milrinona | 20 mL | 400 µg/mL | 286 µg/mL | **−29 %** |
| Esmolol | 20 mL | 4 mg/mL | 2,86 mg/mL | **−29 %** |
| Lidocaína | 20 mL | 4 mg/mL | 2,86 mg/mL | **−29 %** |
| Noradrenalina | 10 mL | 200 µg/mL | 167 µg/mL | −17 % |

**Solución.** Toda preparación se expresa ahora como receta explícita e inequívoca:

> `1 amp (100 mg) + 30 mL SG5% → VOLUMEN FINAL 50 mL`

Los liofilizados (vecuronio, diltiazem, valproato, omeprazol) indican *"reconstituir y COMPLETAR HASTA 50 mL"*.

---

## 2. Ritmos de la tarjeta desincronizados de la calculadora

El texto `ritmo70` estaba escrito a mano y no coincidía con lo que calculaba la propia app:

| Fármaco | Tarjeta (erróneo) | Correcto (70 kg) |
|---|---|---|
| **Adrenalina** | 0,76–5 mL/h | **1,26–8,40 mL/h** |
| **Milrinona** | 2,4–4,7 mL/h | **3,94–7,88 mL/h** |
| **Isoprenalina** | 6,3–126 mL/h | **10,50–210 mL/h** |
| **Dopamina** | 0,5–10,5 mL/h | **1,05–10,50 mL/h** |
| **Fenitoína** | 2,9–3,7 mL/h | **2,92–3,50 mL/h** |
| **Midazolam** | 7–21 mL/h | **7,78–23,33 mL/h** |
| **Morfina** | 4–50 mL/h (rango de otra pauta) | **modo dual explícito** |

**Solución estructural.** Se ha eliminado todo ritmo escrito a mano. Un único motor
(`dosisAmLh`) deriva **todos** los ritmos de `(dosis, unidad, kg, concentración)`. La tarjeta
y la calculadora leen del mismo motor, por lo que **es imposible que vuelvan a divergir**.

---

## 3. Errores de contenido clínico corregidos

- **Amiodarona.** «0,5 mg/min = 900 mg/24 h» era falso: 0,5 × 1.440 = **720 mg/24 h**. Se corrige y se aclara que la pauta de 900 mg/24 h corresponde a 1 mg/min × 6 h + 0,5 mg/min × 18 h.
- **Vasopresina.** Se retira la indicación «PCR: 40 UI IV», fuera de las guías ERC/AHA desde 2015. Se mantiene solo la indicación en shock séptico.
- **Ácido tranexámico.** Estaba clasificado como *anticoagulante*; es un **antifibrinolítico** (efecto opuesto). Nueva categoría propia.
- **Ketamina / fentanilo / morfina / noradrenalina.** Las calculadoras mezclaban el mínimo de una indicación con el máximo de otra (p. ej. fentanilo 7,8–116,7 mL/h, rango que no corresponde a ninguna pauta real). Ahora hay **selector de indicación** con rangos separados y coherentes.
- **Esmolol e isoprenalina.** A dosis altas la dilución exige >200 mL/h (jeringa de 50 mL agotada en 10–14 min). La app ahora **avisa automáticamente** cuando el ritmo máximo agota la jeringa en <30 min y sugiere dilución más concentrada o bomba volumétrica.
- **Erratas:** «NITRO**PUSIATO**» → Nitroprusiato; «Diluyente: **GS**5%» → SG5%; ESEMERÓN → ESMERON; TRACURIO → TRACRIUM.
- Se añaden calculadoras ausentes (diltiazem, insulina, furosemida, omeprazol, heparina) y avisos relevantes (purgado del sistema en insulina, toxicidad por cianuro en nitroprusiato, incompatibilidad amiodarona-SS0,9%).

---

## 4. Arquitectura: fuente única de verdad

**Antes:** la lista de fármacos estaba **duplicada a mano** en `index.html` y en el `SYSTEM_PROMPT` de la función Gemini. Cualquier corrección clínica había que hacerla en dos sitios, con riesgo de divergencia silenciosa.

**Ahora:** `farmacos.json` es la única fuente. Lo consumen tanto la app como el prompt de Gemini (que se genera en tiempo de ejecución a partir de él). **Corriges un fármaco en un solo sitio y se propaga a todo.**

Formato declarativo (sin funciones): cada fármaco define `conc: {valor, unidad}` y sus `modos: [{nombre, min, max, unidad}]`. El motor entiende `mg/kg/h`, `µg/kg/min`, `mg/min`, `µg/min`, `UI/h`, `UI/min`, `mg/kg/día`.

---

## 5. Seguridad y optimización del chat Gemini

| Problema | Corrección |
|---|---|
| Endpoint **abierto a internet**: cualquiera podía consumir la cuota de la API | Validación de `Origin`/`Referer` + **rate limiting** (8 peticiones/min por IP) |
| El error crudo de Gemini se devolvía al cliente | Se registra en el log; al cliente solo mensaje genérico |
| `maxOutputTokens: 1024` **truncaba en silencio** protocolos largos | Subido a 2048 + **aviso explícito** si `finishReason === MAX_TOKENS` |
| Historial de chat enviado **sin límite** (coste creciente) | Acotado a los últimos 10 mensajes y 1.000 caracteres/mensaje |
| Sin timeout: la función podía colgarse | `AbortController` a 25 s → error 504 controlado |
| `node-fetch` innecesario | `fetch` nativo (Node 18+) |
| **Riesgo de alucinación de dosis** | El prompt obliga a usar exclusivamente el vademécum y a **declarar explícitamente** cuando un fármaco no está en la guía o hay incertidumbre. Temperatura bajada a 0,2 |
| XSS potencial en `appendMsg` (`innerHTML` sin escapar) | Escapado previo antes de aplicar formato |

---

## 6. Service worker

**Antes:** estrategia *cache-first* sobre `index.html` → obligaba a incrementar `CACHE_NAME` a mano en cada corrección (ibas por la v9) y los usuarios podían quedarse con datos clínicos obsoletos.

**Ahora:** *network-first* para HTML y `farmacos.json` (siempre la última versión, con caché como respaldo offline), *cache-first* para estáticos. La función Gemini nunca se cachea. **Ya no hace falta bumpear la versión al corregir un fármaco.**

---

## Verificación ejecutada

- ✅ 37 fármacos: concentración declarada = dosis total / 50 mL (0 errores)
- ✅ Todos los ritmos derivados del motor, contrastados contra cálculo manual independiente
- ✅ Prueba funcional en DOM: render, filtros, búsqueda, modal, calculadoras de perfusión y bolo, modos múltiples, avisos automáticos
- ✅ Bug de colisión entre los presets de peso de bolo y perfusión: resuelto
- ✅ Sintaxis validada en `index.html`, `gemini.js`, `service-worker.js`, `farmacos.json`

## Pendiente por tu parte

1. **Validación clínica por Farmacia Hospitalaria / comisión del SUC** antes de uso asistencial.
2. Revisar si el SUC dispone de bomba volumétrica para esmolol/isoprenalina a dosis altas, o si procede definir diluciones alternativas más concentradas.
3. Confirmar las presentaciones concretas del stock real del SUC (algunas ampollas varían de volumen entre laboratorios; el volumen de ampolla ahora **sí importa** para la receta de dilución).
4. Añadir tu dominio propio a `ORIGENES_OK` en `netlify/functions/gemini.js` si mapeas uno.
