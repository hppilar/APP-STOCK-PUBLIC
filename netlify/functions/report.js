/**
 * DepósitoStock — Netlify Function: report
 *
 * Recibe: { filename, content (base64 xlsx), username }
 * Commitea el reporte a la carpeta /reportes del repo privado.
 * Retorna: { ok: true, url } o { error }
 */

const OWNER       = process.env.DATA_OWNER;
const REPO        = process.env.DATA_REPO;
const PAT         = process.env.ADMIN_PAT;
const BRANCH      = process.env.GH_BRANCH   || 'main';
const REPORTS_DIR = process.env.REPORTS_DIR || 'reportes';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return response(400, { error: 'JSON inválido' });
  }

  const { filename, content, username } = body;
  if (!filename || !content) {
    return response(400, { error: 'Faltan campos: filename, content' });
  }

  const path = `${REPORTS_DIR}/${filename}`;

  try {
    // Verificar si el archivo ya existe (para obtener su SHA)
    let sha = null;
    const checkRes = await ghGet(path);
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // Commitear el archivo
    const putBody = {
      message: `📦 Reporte inventario — ${username || 'operador'} — ${filename}`,
      content,   // base64
      branch: BRANCH,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${PAT}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
      return response(502, { error: `Error al subir a GitHub: ${err.message}` });
    }

    return response(200, { ok: true, path });

  } catch (e) {
    return response(500, { error: 'Error interno: ' + e.message });
  }
};

/* ── helpers ── */
function ghGet(path) {
  return fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        'Authorization': `token ${PAT}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );
}

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
