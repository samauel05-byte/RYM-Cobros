import { sql } from './_lib/db.js';
import { requireAdmin } from './_lib/auth.js';

const MAX_LOGO_LENGTH = 700_000; // ~500KB de imagen en base64

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await sql`select logo_data_url as "logoDataUrl" from app_config where id = 1`;
    res.status(200).json({ logoDataUrl: rows[0]?.logoDataUrl || null });
    return;
  }

  if (req.method === 'POST') {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { logoDataUrl } = req.body || {};
    if (logoDataUrl !== null) {
      if (typeof logoDataUrl !== 'string' || !logoDataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'Formato de imagen inválido' });
        return;
      }
      if (logoDataUrl.length > MAX_LOGO_LENGTH) {
        res.status(400).json({ error: 'La imagen es muy grande (máximo ~500KB)' });
        return;
      }
    }

    await sql`update app_config set logo_data_url = ${logoDataUrl}, updated_at = now() where id = 1`;
    res.status(200).json({ logoDataUrl });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
