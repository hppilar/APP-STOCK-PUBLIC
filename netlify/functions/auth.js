/**
 * DepósitoStock — Netlify Function: auth
 * 
 * Recibe: { username, hash }
 * Busca users.json en el repo privado y valida las credenciales.
 * Retorna: { ok, display } o { ok: false, error }
 * 
 * El ADMIN_PAT vive SOLO como variable de entorno en Netlify.
 * Nunca aparece en el código.
 */

const OWNER  = process.env.DATA_OWNER;
const REPO   = process.env.DATA_REPO;
const PAT    = process.env.ADMIN_PAT;
const BRANCH = process.env.GH_BRANCH || 'main';

exports.handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return response(400, { error: 'JSON inválido' });
  }

  const { username, hash } = body;
  if (!username || !hash) {
    return response(400, { error: 'Faltan campos' });
  }

  try {
    // Leer users.json desde repo privado
    const ghRes = await ghGet('data/users.json');
    if (!ghRes.ok) {
      return response(502, { error: `No se pudo leer users.json (GitHub ${ghRes.status})` });
    }
    const fileData = await ghRes.json();
    const raw      = Buffer.from(fileData.content, 'base64').toString('utf8');
    const users    = JSON.parse(raw);

    // Buscar usuario
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.hash === hash
    );

    if (!user) {
      return response(401, { ok: false, error: 'Usuario o contraseña incorrectos' });
    }
    if (user.active === false) {
      return response(403, { ok: false, error: 'Cuenta desactivada. Contactá al administrador.' });
    }

    return response(200, { ok: true, display: user.display || user.username });

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
