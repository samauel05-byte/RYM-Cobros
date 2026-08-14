import bcrypt from 'bcryptjs';
import { sql } from '../../../_lib/db.js';
import { requireSuperAdmin } from '../../../_lib/auth.js';

export default async function handler(req, res) {
  const admin = requireSuperAdmin(req, res);
  if (!admin) return;

  const empresaId = Number(req.query.id);
  const userId = Number(req.query.userId);
  if (!Number.isInteger(empresaId) || !Number.isInteger(userId)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'PUT') {
    const { pass } = req.body || {};
    if (!pass || pass.length < 4) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
      return;
    }
    const hash = await bcrypt.hash(pass, 10);
    const rows = await sql`
      update usuarios set password_hash = ${hash}
      where id = ${userId} and empresa_id = ${empresaId}
      returning id, nombre, usuario as "user"
    `;
    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado en esa empresa' });
      return;
    }
    res.status(200).json({ user: rows[0] });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
