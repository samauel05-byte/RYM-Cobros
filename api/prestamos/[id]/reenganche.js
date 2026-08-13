import { sql } from '../../_lib/db.js';
import { requireCajeroOrAdmin } from '../../_lib/auth.js';
import { calcPrestamo, validatePrestamoInput } from '../../_lib/calc.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const user = requireCajeroOrAdmin(req, res);
  if (!user) return;

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  const original = (await sql`select id, nombre, cedula, balance from prestamos where id = ${id} and empresa_id = ${user.empresaId}`)[0];
  if (!original) {
    res.status(404).json({ error: 'Préstamo original no encontrado' });
    return;
  }
  if (Number(original.balance) > 0) {
    res.status(400).json({ error: 'El préstamo original aún no está pagado completamente' });
    return;
  }

  const body = req.body || {};
  const err = validatePrestamoInput({ ...body, nombre: original.nombre });
  if (err) {
    res.status(400).json({ error: err });
    return;
  }
  const { monto, porciento, cuotas, frecuencia, fechaInicio } = body;
  const { cuota, total } = calcPrestamo(Number(monto), Number(porciento), Number(cuotas), frecuencia);

  const rows = await sql`
    insert into prestamos (empresa_id, nombre, cedula, monto, porciento, frecuencia, cuotas, total_pagar, cuota, balance, total_pagado, fecha_inicio, estado, reenganche_de)
    values (${user.empresaId}, ${original.nombre}, ${original.cedula}, ${monto}, ${porciento}, ${frecuencia}, ${cuotas}, ${total}, ${cuota}, ${total}, 0, ${fechaInicio || null}, 'activo', ${id})
    returning id, nombre, cedula, monto, porciento, frecuencia, cuotas,
      total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
      fecha_inicio as "fechaInicio", estado, reenganche_de as "reenganchemDe"
  `;
  const prestamo = { ...rows[0], historialPagos: [] };
  res.status(201).json({ prestamo });
}
