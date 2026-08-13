import { sql } from './db.js';

// Resuelve la empresa activa a partir del slug de la URL. Sin slug, cae en la
// empresa marcada es_default=true (RYM Soluciones), para que el link actual
// sin slug siga funcionando igual que antes. Si se pasa un slug pero no
// corresponde a ninguna empresa, se devuelve null explícitamente (NO cae en
// la empresa por defecto) — un link/slug mal escrito debe fallar, no colar
// silenciosamente a alguien a otra empresa.
export async function resolveEmpresa(slug) {
  if (slug) {
    const rows = await sql`select id, nombre, slug, logo_data_url as "logoDataUrl" from empresas where slug = ${slug}`;
    return rows[0] || null;
  }
  const rows = await sql`select id, nombre, slug, logo_data_url as "logoDataUrl" from empresas where es_default = true limit 1`;
  return rows[0] || null;
}
