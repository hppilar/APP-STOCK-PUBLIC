/**
 * DepósitoStock — Netlify Function: catalog
 *
 * Devuelve el contenido base64 del Excel de catálogo
 * desde el repositorio privado.
 *
 * Soporta archivos grandes (>1MB) usando la Git Blob API.
 * La API estándar de GitHub no incluye `content` para archivos >1MB,
 * en ese caso se obtiene el blob_sha y se llama al endpoint de blobs.
 *
 * Retorna: { content: '<base64>' }
 */

const OWNER  = process.env.DATA_OWNER;
const REPO   = process.env.DATA_REPO;
const PAT    = process.env.ADMIN_PAT;
const BRANCH = process.env.GH_BRANCH || 'main';
const EXCEL  = process.env.EXCEL_PATH || 'data/catalogo.xlsx';

const GH_HEADERS = {
  'Authorization': `token ${PAT}`,
  'Accept': 'application/vnd.github.v3+json',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    // ── Paso 1: obtener metadata del archivo ──────────────────────────
    const metaRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${EXCEL}?ref=${BRANCH}`,
      { headers: GH_HEADERS }
    );

    if (!metaRes.ok) {
      return response(502, { error: `No se pudo leer el catálogo (GitHub ${metaRes.status})` });
    }

    const meta = await metaRes.json();

    // ── Paso 2: si content está presente y no vacío → usarlo directo ──
    if (meta.content && meta.content.trim() !== '') {
      return response(200, { content: meta.content.replace(/\n/g, '') });
    }

    // ── Paso 3: archivo >1MB → usar Git Blob API con el sha del blob ──
    if (!meta.sha) {
      return response(502, { error: 'No se pudo obtener el SHA del archivo' });
    }

    const blobRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/blobs/${meta.sha}`,
      { headers: GH_HEADERS }
    );

    if (!blobRes.ok) {
      return response(502, { error: `Error al leer blob (GitHub ${blobRes.status})` });
    }

    const blob = await blobRes.json();

    if (!blob.content) {
      return response(502, { error: 'El blob no tiene contenido' });
    }

    return response(200, { content: blob.content.replace(/\n/g, '') });

  } catch (e) {
    return response(500, { error: 'Error interno: ' + e.message });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
