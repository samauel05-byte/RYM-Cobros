import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { requireSuperAdmin } from '../_lib/auth.js';
import { PLATFORM_SLUG } from '../_lib/empresa.js';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LOGO_LENGTH = 700_000; // ~500KB de imagen en base64

async function listar(req, res) {
  const empresas = await sql`
    select e.id, e.nombre, e.slug, e.es_default as "esDefault",
      (select count(*) from prestamos p where p.empresa_id = e.id) as "totalPrestamos",
      (select count(*) from usuarios u where u.empresa_id = e.id) as "totalUsuarios"
    from empresas e
    order by e.id
  `;
  res.status(200).json({ empresas });
}

async function detalle(req, res, id) {
  const empresaRows = await sql`select id, nombre, slug from empresas where id = ${id}`;
  if (!empresaRows[0]) {
    res.status(404).json({ error: 'Empresa no encontrada' });
    return;
  }

  const usuarios = await sql`
    select id, nombre, usuario as "user", role
    from usuarios where empresa_id = ${id}
    order by id
  `;

  const prestamos = await sql`
    select id, nombre, cedula, monto, porciento, frecuencia, cuotas,
      total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
      fecha_inicio as "fechaInicio", estado
    from prestamos where empresa_id = ${id}
    order by nombre
  `;

  const totales = prestamos.reduce(
    (acc, p) => {
      acc.totalPrestado += Number(p.monto);
      acc.saldoPendiente += Number(p.balance);
      acc.totalCobrado += Number(p.totalPagado);
      return acc;
    },
    { totalPrestado: 0, saldoPendiente: 0, totalCobrado: 0 }
  );

  res.status(200).json({ empresa: empresaRows[0], usuarios, prestamos, totales });
}

async function crearEmpresa(req, res) {
  const { nombre, slug, adminNombre, adminUsuario, adminPass, adminRole, logoDataUrl } = req.body || {};
  if (!nombre || !slug || !adminNombre || !adminUsuario || !adminPass) {
    res.status(400).json({ error: 'Complete todos los campos' });
    return;
  }
  const rolePrimerUsuario = adminRole || 'admin';
  if (!['admin', 'cajero', 'viewer'].includes(rolePrimerUsuario)) {
    res.status(400).json({ error: 'role inválido' });
    return;
  }
  const slugNormalizado = String(slug).trim().toLowerCase();
  if (!SLUG_RE.test(slugNormalizado)) {
    res.status(400).json({ error: 'El link solo puede tener letras minúsculas, números y guiones (ej: mi-empresa)' });
    return;
  }
  if (slugNormalizado === PLATFORM_SLUG) {
    res.status(400).json({ error: `El link "${PLATFORM_SLUG}" está reservado, elige otro` });
    return;
  }
  if (adminPass.length < 4) {
    res.status(400).json({ error: 'La contraseña del administrador debe tener al menos 4 caracteres' });
    return;
  }
  if (logoDataUrl) {
    if (typeof logoDataUrl !== 'string' || !logoDataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Formato de imagen inválido' });
      return;
    }
    if (logoDataUrl.length > MAX_LOGO_LENGTH) {
      res.status(400).json({ error: 'La imagen es muy grande (máximo ~500KB)' });
      return;
    }
  }

  const dupSlug = await sql`select id from empresas where slug = ${slugNormalizado}`;
  if (dupSlug.length) {
    res.status(409).json({ error: 'Ese link de empresa ya está en uso' });
    return;
  }

  const empresaRows = await sql`
    insert into empresas (nombre, slug, logo_data_url) values (${nombre}, ${slugNormalizado}, ${logoDataUrl || null})
    returning id, nombre, slug
  `;
  const empresa = empresaRows[0];

  const hash = await bcrypt.hash(adminPass, 10);
  await sql`
    insert into usuarios (empresa_id, nombre, usuario, password_hash, role, is_super_admin)
    values (${empresa.id}, ${adminNombre}, ${adminUsuario}, ${hash}, ${rolePrimerUsuario}, false)
  `;

  res.status(201).json({ empresa });
}

async function crearUsuarioEnEmpresa(req, res, empresaId) {
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

async function restablecerPassword(req, res, empresaId) {
  const userId = Number(req.query.userId);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: 'userId inválido' });
    return;
  }
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
}

export default async function handler(req, res) {
  const user = requireSuperAdmin(req, res);
  if (!user) return;

  const query = req.query || {};
  const hasId = query.id !== undefined;
  const id = hasId ? Number(query.id) : null;
  if (hasId && !Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'GET') {
    return hasId ? detalle(req, res, id) : listar(req, res);
  }
  if (req.method === 'POST') {
    return hasId ? crearUsuarioEnEmpresa(req, res, id) : crearEmpresa(req, res);
  }
  if (req.method === 'PUT' && hasId) {
    return restablecerPassword(req, res, id);
  }

  res.status(405).json({ error: 'Método no permitido' });
}
