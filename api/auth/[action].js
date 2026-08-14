import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { setSessionCookie, clearSessionCookie, getCurrentUser } from '../_lib/auth.js';
import { resolveEmpresa, PLATFORM_SLUG } from '../_lib/empresa.js';

async function login(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const { user, pass, empresaSlug } = req.body || {};
  if (!user || !pass) {
    res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    return;
  }

  // Link reservado /admin: login de plataforma, no ligado a ninguna empresa.
  if (empresaSlug === PLATFORM_SLUG) {
    const rows = await sql`
      select id, nombre, usuario as "user", password_hash, role, is_super_admin as "isSuperAdmin"
      from usuarios where usuario = ${user} and empresa_id is null
    `;
    const found = rows[0];
    if (!found || !(await bcrypt.compare(pass, found.password_hash))) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      return;
    }
    const publicUser = {
      id: found.id,
      nombre: found.nombre,
      user: found.user,
      role: found.role,
      isSuperAdmin: found.isSuperAdmin,
      empresaId: null,
    };
    setSessionCookie(res, publicUser);
    res.status(200).json({ user: publicUser, empresa: null });
    return;
  }

  const empresa = await resolveEmpresa(empresaSlug);
  if (!empresa) {
    res.status(404).json({ error: 'Empresa no encontrada' });
    return;
  }

  const rows = await sql`
    select id, nombre, usuario as "user", password_hash, role, is_super_admin as "isSuperAdmin"
    from usuarios where usuario = ${user} and empresa_id = ${empresa.id}
  `;
  const found = rows[0];
  if (!found || !(await bcrypt.compare(pass, found.password_hash))) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    return;
  }

  const publicUser = {
    id: found.id,
    nombre: found.nombre,
    user: found.user,
    role: found.role,
    isSuperAdmin: found.isSuperAdmin,
    empresaId: empresa.id,
  };
  setSessionCookie(res, publicUser);
  res.status(200).json({
    user: publicUser,
    empresa: { nombre: empresa.nombre, slug: empresa.slug, logoDataUrl: empresa.logoDataUrl },
  });
}

async function logout(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}

async function me(req, res) {
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

export default async function handler(req, res) {
  const { action } = req.query;
  if (action === 'login') return login(req, res);
  if (action === 'logout') return logout(req, res);
  if (action === 'me') return me(req, res);
  res.status(404).json({ error: 'No encontrado' });
}
