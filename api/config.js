import { sql } from './_lib/db.js';
import { requireAdmin } from './_lib/auth.js';
import { resolveEmpresa } from './_lib/empresa.js';

const MAX_LOGO_LENGTH = 700_000; // ~500KB de imagen en base64

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Público (necesario para mostrar el logo/nombre antes de iniciar sesión).
    // ?empresa=slug identifica la empresa por su link; sin slug cae en la empresa por defecto.
    const empresa = await resolveEmpresa(req.query.empresa);
    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }
    res.status(200).json({ logoDataUrl: empresa.logoDataUrl || null, nombre: empresa.nombre, slug: empresa.slug });
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

    await sql`update empresas set logo_data_url = ${logoDataUrl} where id = ${admin.empresaId}`;
    res.status(200).json({ logoDataUrl });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
