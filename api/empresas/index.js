import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { requireSuperAdmin } from '../_lib/auth.js';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LOGO_LENGTH = 700_000; // ~500KB de imagen en base64

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const user = requireSuperAdmin(req, res);
    if (!user) return;
    const empresas = await sql`
      select e.id, e.nombre, e.slug, e.es_default as "esDefault",
        (select count(*) from prestamos p where p.empresa_id = e.id) as "totalPrestamos",
        (select count(*) from usuarios u where u.empresa_id = e.id) as "totalUsuarios"
      from empresas e
      order by e.id
    `;
    res.status(200).json({ empresas });
    return;
  }

  if (req.method === 'POST') {
    const user = requireSuperAdmin(req, res);
    if (!user) return;

    const { nombre, slug, adminNombre, adminUsuario, adminPass, logoDataUrl } = req.body || {};
    if (!nombre || !slug || !adminNombre || !adminUsuario || !adminPass) {
      res.status(400).json({ error: 'Complete todos los campos' });
      return;
    }
    const slugNormalizado = String(slug).trim().toLowerCase();
    if (!SLUG_RE.test(slugNormalizado)) {
      res.status(400).json({ error: 'El link solo puede tener letras minúsculas, números y guiones (ej: mi-empresa)' });
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
      values (${empresa.id}, ${adminNombre}, ${adminUsuario}, ${hash}, 'admin', false)
    `;

    res.status(201).json({ empresa });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
