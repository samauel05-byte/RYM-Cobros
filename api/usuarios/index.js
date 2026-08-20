import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';

async function listar(req, res, admin) {
  const users = await sql`select id, nombre, usuario as "user", role from usuarios where empresa_id = ${admin.empresaId} order by id`;
  res.status(200).json({ users });
}

async function crear(req, res, admin) {
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
}

async function editar(req, res, admin, id) {
  const { nombre, user: usuario, pass, role } = req.body || {};
  if (!nombre || !usuario) {
    res.status(400).json({ error: 'Complete nombre y usuario' });
    return;
  }
  if (!['admin', 'cajero', 'viewer'].includes(role)) {
    res.status(400).json({ error: 'role inválido' });
    return;
  }
  if (pass && pass.length < 4) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
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
}

async function eliminar(req, res, admin, id) {
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
}

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const query = req.query || {};
  const hasId = query.id !== undefined;
  const id = hasId ? Number(query.id) : null;
  if (hasId && !Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'GET' && !hasId) return listar(req, res, admin);
  if (req.method === 'POST' && !hasId) return crear(req, res, admin);
  if (req.method === 'PUT' && hasId) return editar(req, res, admin, id);
  if (req.method === 'DELETE' && hasId) return eliminar(req, res, admin, id);

  res.status(405).json({ error: 'Método no permitido' });
}
