# Guía Rápida de Perfusión SUC — Registro de cambios

## v2.1.0-borrador (12/11/2026) — feedback de usuarios de prueba

Todo lo clínico sigue pendiente de validación por Farmacia. Los dos fármacos nuevos van marcados con estado `revisar`.

**Presentación**
- Título y orden por principio activo; el comercial pasa a secundario (la búsqueda sigue por ambos).
- Categorías nuevas «Digestivo» y «Diurético»; «Revertidor» pasa a «Antídoto».
- La calculadora muestra siempre cuánto dura la jeringa al ritmo calculado.

**Seguridad del selector de ampollas**
- Tope físico: el fármaco no puede ocupar más que la jeringa (antes dejaba subir hasta 20 ampollas y calculaba una concentración imposible; p. ej. 3 ampollas de dobutamina son 60 mL).
- Sin selector en fármacos puros (propofol, fenitoína) ni en insulina: 1 UI/mL es el estándar y «1 vial» se leía como 1.000 UI.
- En la preparación estándar se muestra el texto validado del dato; solo se regenera al modificar las ampollas.

**Datos**
- Lidocaína: receta explícita al 1 % y aviso para ampollas al 2 % y 5 %.
- Insulina: «50 UI (0,5 mL del vial, con jeringa de insulina)»; Actrapid / Humulina Regular; «nunca NPH ni mezclas IV»; retirado «purgar 20 mL».
- Furosemida: aviso de la jeringa hospitalaria de 250 mg/50 mL (ritmo distinto). Dotación: solo ampollas de 20 mg.
- Amiodarona: tercer modo «900 mg/24 h (ritmo constante)» = 6,3 mL/h con la misma jeringa.
- Midazolam: añadida la ampolla de 5 mg/5 mL como «otra presentación».
- Esmolol: eliminada la referencia a bomba volumétrica (no hay en la dotación).
- Nuevos: Somatostatina (3 mg/50 mL) y Acetilcisteína — Hidonac Antídoto, en 5 jeringas de 50 mL: carga 2 × 30 min a 100 mL/h, mantenimiento 1 a 12,5 mL/h (4 h), mantenimiento 2 2 × 8 h a 6,25 mL/h. Ritmos fijos; el peso solo cambia los mL de NAC por jeringa. Tope de cálculo 110 kg.

**Calidad**
- Una sola fuente de datos: `public/farmacos.json`. La copia empaquetada (`src/data/defaultDataset.ts`) se regenera sola en cada `dev`/`build`.
- `npm test`: validación independiente de los datos (Python) y del motor real de la app, incluidas todas las combinaciones del selector de ampollas.
