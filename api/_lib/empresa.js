import { sql } from './db.js';

// Resuelve la empresa activa a partir del slug de la URL. Si no se pasa slug
// (o no existe), cae en la empresa marcada es_default=true (RYM Soluciones),
// para que el link actual sin slug siga funcionando igual que antes.
export async function resolveEmpresa(slug) {
  if (slug) {
    const rows = await sql`select id, nombre, slug, logo_data_url as "logoDataUrl" from empresas where slug = ${slug}`;
    if (rows[0]) return rows[0];
  }
  const rows = await sql`select id, nombre, slug, logo_data_url as "logoDataUrl" from empresas where es_default = true limit 1`;
  return rows[0] || null;
}
