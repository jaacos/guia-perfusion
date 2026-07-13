// ═══════════════════════════════════════════════════════════════════════════════
//  Proxy Gemini — Guía Rápida de Perfusión (SUC)
//  El vademécum NO se duplica aquí: se genera desde farmacos.json (fuente única).
// ═══════════════════════════════════════════════════════════════════════════════
const FARMACOS = require('../../farmacos.json');

// ── Config ────────────────────────────────────────────────────────────────────
const MODELO         = 'gemini-2.5-flash';
const MAX_TOKENS     = 2048;   // 1024 truncaba protocolos largos (ISR, status)
const MAX_HISTORIAL  = 10;     // mensajes conservados (5 turnos)
const MAX_CHARS_MSG  = 1000;
const VENTANA_MS     = 60000;  // rate limit: ventana de 1 min
const MAX_PETICIONES = 8;      // ... por IP y ventana

const ORIGENES_OK = [
    'https://guiaperf.netlify.app'
    // añade aquí tu dominio propio si lo mapeas
];

// ── Rate limiting en memoria (best-effort; se reinicia con la función fría) ────
const buckets = new Map();
function permitido(ip) {
    const ahora = Date.now();
    const recientes = (buckets.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
    if (recientes.length >= MAX_PETICIONES) return false;
    recientes.push(ahora);
    buckets.set(ip, recientes);
    if (buckets.size > 5000) buckets.clear(); // purga defensiva
    return true;
}

// ── Motor de conversión (idéntico al de la app) ───────────────────────────────
const FACTOR = { 'mg': { 'mg': 1, 'µg': 1000 }, 'µg': { 'µg': 1, 'mg': 0.001 }, 'UI': { 'UI': 1 } };
function mLh(dose, unidad, kg, conc) {
    const p = unidad.split('/');
    const t = p[p.length - 1];
    let porHora = dose * (p.includes('kg') ? kg : 1);
    if (t === 'min') porHora *= 60;
    if (t === 'día') porHora /= 24;
    const f = FACTOR[p[0]] && FACTOR[p[0]][conc.unidad];
    return f == null ? NaN : (porHora * f) / conc.valor;
}
const fmtNum = n => (Number.isFinite(n) ? String(Math.round(n * 100) / 100).replace('.', ',') : '—');

// ── Vademécum derivado de los datos reales de la app ──────────────────────────
function lineaFarmaco(f) {
    const dosis = (f.modos || [])
        .map(m => `${m.nombre} ${fmtNum(m.min)}–${fmtNum(m.max)} ${m.unidad}`)
        .join(' | ') || 'solo bolo';
    const ritmo = (f.modos || [])
        .map(m => `${m.nombre} ${fmtNum(mLh(m.min, m.unidad, 70, f.conc))}–${fmtNum(mLh(m.max, m.unidad, 70, f.conc))} mL/h`)
        .join(' | ');
    let s = `- ${f.principioActivo} (${f.nombreComercial}) [${f.categoria}]`;
    s += `\n  · Preparación: ${f.dilucion}`;
    s += `\n  · Concentración: ${f.concTexto}`;
    s += `\n  · Bolo: ${f.bolo || '—'}`;
    s += `\n  · Perfusión: ${dosis}`;
    s += `\n  · Ritmo a 70 kg: ${ritmo || '—'}`;
    if (f.observaciones)      s += `\n  · Nota: ${f.observaciones}`;
    if (f.contraindicaciones) s += `\n  · CI: ${f.contraindicaciones}`;
    if (f.incompatibilidades) s += `\n  · Incompatibilidad: ${f.incompatibilidades}`;
    return s;
}

const VADEMECUM = FARMACOS.map(lineaFarmaco).join('\n');

const SYSTEM_PROMPT = `Eres un asistente clínico de emergencias integrado en la app de perfusiones del Servicio de Urgencias Canario (SUC).

PERFIL DEL USUARIO: enfermero o médico de emergencias con formación avanzada. Terminología técnica, sin explicar conceptos básicos. Respuestas directas y accionables.

═══ REGLA CRÍTICA DE SEGURIDAD ═══
Para CUALQUIER pregunta sobre dilución, concentración o ritmo de perfusión de un fármaco que figure en el VADEMÉCUM DE LA APP, usa EXCLUSIVAMENTE los datos de abajo. NUNCA inventes ni recuperes de memoria una dilución distinta a la listada.
Si el fármaco NO está en el vademécum, dilo de forma explícita ("No está en la guía de la app") y solo entonces ofrece la referencia general, marcándola como externa a la app y pendiente de verificar en ficha técnica.
Si no estás seguro de una cifra, dilo. Es preferible declarar incertidumbre que dar una dosis errónea.
Todas las diluciones de la app son a VOLUMEN FINAL de 50 mL (fármaco + diluyente = 50 mL), no "añadir a 50 mL".

═══ VADEMÉCUM DE LA APP (volumen final 50 mL) ═══
${VADEMECUM}

═══ ALCANCE ═══
Vasoactivos, sedación, analgesia, relajantes neuromusculares, antiarrítmicos, antiepilépticos, anticoagulantes; interacciones y compatibilidades IV; protocolos de emergencia (PCR, shock, ISR/IOT, status epiléptico, SCA, TEP, hemorragia masiva).

═══ FORMATO ═══
- Sin preámbulos.
- Si hay cálculo de dosis, muéstralo paso a paso (dosis → mg/h o µg/min → mL/h) citando la concentración usada.
- Si hay contraindicación o incompatibilidad relevante, destácala al inicio.
- Máximo 5-6 líneas salvo que la complejidad lo exija.
- No añadas disclaimers genéricos del tipo "consulta con un médico": el usuario ES el profesional. Sí debes señalar incertidumbre técnica concreta cuando exista.`;

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

    // Control de origen: evita que terceros consuman tu cuota de la API
    const origen = event.headers.origin || event.headers.referer || '';
    const autorizado = ORIGENES_OK.some(o => origen.startsWith(o));
    const esPreview  = /--[a-z0-9-]+\.netlify\.app/.test(origen); // deploy previews
    if (origen && !autorizado && !esPreview) return json(403, { error: 'Origen no autorizado' });

    // Rate limiting por IP
    const ip = event.headers['x-nf-client-connection-ip']
            || (event.headers['x-forwarded-for'] || '').split(',')[0].trim()
            || 'desconocida';
    if (!permitido(ip)) return json(429, { error: 'Demasiadas consultas. Espera unos segundos.' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[gemini] GEMINI_API_KEY no configurada');
        return json(503, { error: 'Servicio no disponible' });
    }

    let body;
    try { body = JSON.parse(event.body); }
    catch { return json(400, { error: 'JSON inválido' }); }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return json(400, { error: 'Falta el campo messages' });
    }

    // Saneado: recorta historial y longitud, descarta entradas malformadas
    const contents = body.messages
        .filter(m => m && typeof m.content === 'string' && m.content.trim())
        .slice(-MAX_HISTORIAL)
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content.slice(0, MAX_CHARS_MSG) }]
        }));

    if (!contents.length) return json(400, { error: 'Mensajes vacíos' });

    const payload = {
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: MAX_TOKENS },
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
    };

    try {
        // Node 18+ en Netlify: fetch es global, node-fetch era innecesario
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 25000);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: ctrl.signal
            }
        );
        clearTimeout(timeout);

        if (!res.ok) {
            // El detalle se registra, NO se devuelve al cliente
            console.error('[gemini] upstream', res.status, await res.text());
            return json(502, { error: 'El asistente no está disponible ahora mismo.' });
        }

        const data = await res.json();
        const cand = data && data.candidates && data.candidates[0];
        const partes = (cand && cand.content && cand.content.parts) || [];
        const texto = partes.map(p => p.text).filter(Boolean).join('');

        if (!texto) {
            const motivo = (cand && cand.finishReason)
                || (data.promptFeedback && data.promptFeedback.blockReason)
                || 'desconocido';
            console.warn('[gemini] respuesta vacía, motivo=', motivo);
            return json(200, { reply: `⚠ No se ha podido generar respuesta (motivo: ${motivo}). Reformula la consulta.` });
        }

        // Avisa si la respuesta se cortó, en lugar de entregarla truncada en silencio
        const reply = cand.finishReason === 'MAX_TOKENS'
            ? texto + '\n\n⚠ Respuesta truncada por longitud. Pide la parte que falte.'
            : texto;

        return json(200, { reply });

    } catch (err) {
        const abortada = err.name === 'AbortError';
        console.error('[gemini] catch:', err);
        return json(abortada ? 504 : 500, {
            error: abortada
                ? 'La consulta ha tardado demasiado. Inténtalo de nuevo.'
                : 'Error interno del asistente.'
        });
    }
};

function json(statusCode, obj) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(obj)
    };
}
