import { getCurrentUser } from '../_lib/auth.js';
import { sql } from '../_lib/db.js';

export default async function handler(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  const rows = await sql`select nombre, slug, logo_data_url as "logoDataUrl" from empresas where id = ${user.empresaId}`;
  res.status(200).json({
    user: {
      id: user.id,
      nombre: user.nombre,
      user: user.user,
      role: user.role,
      isSuperAdmin: !!user.isSuperAdmin,
      empresaId: user.empresaId,
    },
    empresa: rows[0] || null,
  });
}
