import { sql } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { calcPrestamo, validatePrestamoInput } from '../_lib/calc.js';

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'PUT') {
    const user = requireAdmin(req, res);
    if (!user) return;

    const body = req.body || {};
    const err = validatePrestamoInput(body);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
    const { nombre, cedula, monto, porciento, cuotas, frecuencia, fechaInicio } = body;

    const existingRows = await sql`select total_pagado from prestamos where id = ${id} and empresa_id = ${user.empresaId}`;
    if (!existingRows[0]) {
      res.status(404).json({ error: 'Préstamo no encontrado' });
      return;
    }
    const pagado = Number(existingRows[0].total_pagado);
    const { cuota, total } = calcPrestamo(Number(monto), Number(porciento), Number(cuotas), frecuencia);
    const nuevoBalance = Math.max(0, total - pagado);

    const rows = await sql`
      update prestamos set
        nombre = ${nombre}, cedula = ${cedula || null}, monto = ${monto}, porciento = ${porciento},
        frecuencia = ${frecuencia}, cuotas = ${cuotas}, total_pagar = ${total}, cuota = ${cuota},
        balance = ${nuevoBalance}, fecha_inicio = ${fechaInicio || null}, updated_at = now()
      where id = ${id} and empresa_id = ${user.empresaId}
      returning id, nombre, cedula, monto, porciento, frecuencia, cuotas,
        total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
        fecha_inicio as "fechaInicio", estado, reenganche_de as "reenganchemDe"
    `;
    res.status(200).json({ prestamo: rows[0] });
    return;
  }

  if (req.method === 'DELETE') {
    const user = requireAdmin(req, res);
    if (!user) return;
    const rows = await sql`delete from prestamos where id = ${id} and empresa_id = ${user.empresaId} returning id`;
    if (!rows[0]) {
      res.status(404).json({ error: 'Préstamo no encontrado' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
