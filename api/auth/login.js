import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { setSessionCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const { user, pass } = req.body || {};
  if (!user || !pass) {
    res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    return;
  }

  const rows = await sql`select id, nombre, usuario as "user", password_hash, role from usuarios where usuario = ${user}`;
  const found = rows[0];
  if (!found || !(await bcrypt.compare(pass, found.password_hash))) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    return;
  }

  const publicUser = { id: found.id, nombre: found.nombre, user: found.user, role: found.role };
  setSessionCookie(res, publicUser);
  res.status(200).json({ user: publicUser });
}
