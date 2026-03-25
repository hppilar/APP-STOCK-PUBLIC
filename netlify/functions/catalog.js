/**
 * DepósitoStock — Netlify Function: catalog
 *
 * Devuelve el contenido base64 del Excel de catálogo
 * desde el repositorio privado.
 *
 * No recibe parámetros (GET simple).
 * Retorna: { content: '<base64>' }
 */

const OWNER  = process.env.DATA_OWNER;
const REPO   = process.env.DATA_REPO;
const PAT    = process.env.ADMIN_PAT;
const BRANCH = process.env.GH_BRANCH || 'main';
const EXCEL  = process.env.EXCEL_PATH || 'data/catalogo.xlsx';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${EXCEL}?ref=${BRANCH}`,
      {
        headers: {
          'Authorization': `token ${PAT}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!ghRes.ok) {
      return response(502, { error: `No se pudo leer el catálogo (GitHub ${ghRes.status})` });
    }

    const data = await ghRes.json();

    // Devolver solo el base64 (el browser lo decodifica)
    return response(200, { content: data.content.replace(/\n/g, '') });

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
