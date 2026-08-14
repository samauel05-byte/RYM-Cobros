import { sql } from '../_lib/db.js';
import { requireSuperAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const user = requireSuperAdmin(req, res);
  if (!user) return;

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

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
