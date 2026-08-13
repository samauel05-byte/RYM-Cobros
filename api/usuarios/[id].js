import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'PUT') {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { nombre, user: usuario, pass, role } = req.body || {};
    if (!nombre || !usuario) {
      res.status(400).json({ error: 'Complete nombre y usuario' });
      return;
    }
    if (!['admin', 'cajero', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'role inválido' });
      return;
    }
    const dup = await sql`select id from usuarios where usuario = ${usuario} and id != ${id} and empresa_id = ${admin.empresaId}`;
    if (dup.length) {
      res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
      return;
    }

    let rows;
    if (pass) {
      const hash = await bcrypt.hash(pass, 10);
      rows = await sql`
        update usuarios set nombre = ${nombre}, usuario = ${usuario}, role = ${role}, password_hash = ${hash}
        where id = ${id} and empresa_id = ${admin.empresaId}
        returning id, nombre, usuario as "user", role
      `;
    } else {
      rows = await sql`
        update usuarios set nombre = ${nombre}, usuario = ${usuario}, role = ${role}
        where id = ${id} and empresa_id = ${admin.empresaId}
        returning id, nombre, usuario as "user", role
      `;
    }
    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ user: rows[0] });
    return;
  }

  if (req.method === 'DELETE') {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    if (admin.id === id) {
      res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      return;
    }
    const rows = await sql`delete from usuarios where id = ${id} and empresa_id = ${admin.empresaId} returning id`;
    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
