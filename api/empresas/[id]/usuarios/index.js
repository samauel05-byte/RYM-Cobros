import bcrypt from 'bcryptjs';
import { sql } from '../../../_lib/db.js';
import { requireSuperAdmin } from '../../../_lib/auth.js';

export default async function handler(req, res) {
  const admin = requireSuperAdmin(req, res);
  if (!admin) return;

  const empresaId = Number(req.query.id);
  if (!Number.isInteger(empresaId)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { nombre, user: usuario, pass, role } = req.body || {};
  if (!nombre || !usuario || !pass) {
    res.status(400).json({ error: 'Complete nombre, usuario y contraseña' });
    return;
  }
  if (!['admin', 'cajero', 'viewer'].includes(role)) {
    res.status(400).json({ error: 'role inválido' });
    return;
  }
  if (pass.length < 4) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    return;
  }

  const empresaRows = await sql`select id from empresas where id = ${empresaId}`;
  if (!empresaRows[0]) {
    res.status(404).json({ error: 'Empresa no encontrada' });
    return;
  }

  const dup = await sql`select id from usuarios where usuario = ${usuario} and empresa_id = ${empresaId}`;
  if (dup.length) {
    res.status(409).json({ error: 'Ese usuario ya existe en esa empresa' });
    return;
  }

  const hash = await bcrypt.hash(pass, 10);
  const rows = await sql`
    insert into usuarios (empresa_id, nombre, usuario, password_hash, role)
    values (${empresaId}, ${nombre}, ${usuario}, ${hash}, ${role})
    returning id, nombre, usuario as "user", role
  `;
  res.status(201).json({ user: rows[0] });
}
