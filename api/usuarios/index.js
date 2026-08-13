import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const user = requireAdmin(req, res);
    if (!user) return;
    const users = await sql`select id, nombre, usuario as "user", role from usuarios where empresa_id = ${user.empresaId} order by id`;
    res.status(200).json({ users });
    return;
  }

  if (req.method === 'POST') {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { nombre, user: usuario, pass, role } = req.body || {};
    if (!nombre || !usuario || !pass) {
      res.status(400).json({ error: 'Complete nombre, usuario y contraseña' });
      return;
    }
    if (!['admin', 'cajero', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'role inválido' });
      return;
    }
    const dup = await sql`select id from usuarios where usuario = ${usuario} and empresa_id = ${admin.empresaId}`;
    if (dup.length) {
      res.status(409).json({ error: 'Ese usuario ya existe' });
      return;
    }
    const hash = await bcrypt.hash(pass, 10);
    const rows = await sql`
      insert into usuarios (empresa_id, nombre, usuario, password_hash, role)
      values (${admin.empresaId}, ${nombre}, ${usuario}, ${hash}, ${role})
      returning id, nombre, usuario as "user", role
    `;
    res.status(201).json({ user: rows[0] });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
