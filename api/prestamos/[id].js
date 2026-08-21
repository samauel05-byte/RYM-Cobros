import { sql, getPool } from '../_lib/db.js';
import { requireAdmin, requireCajeroOrAdmin } from '../_lib/auth.js';
import { calcPrestamo, validatePrestamoInput, aplicarPagoRevolvente, sumarPeriodo } from '../_lib/calc.js';

async function editar(req, res, id) {
  const user = requireAdmin(req, res);
  if (!user) return;

  const body = req.body || {};
  const err = validatePrestamoInput(body);
  if (err) {
    res.status(400).json({ error: err });
    return;
  }
  const { nombre, cedula, monto, porciento, cuotas, frecuencia, fechaInicio } = body;

  // Los términos (nombre, %, frecuencia, etc.) se pueden corregir, pero el capital
  // pendiente y el interés acumulado NO se tocan aquí — solo cambian al registrar
  // un pago. Editar nunca borra el progreso real de la deuda.
  const existingRows = await sql`select capital_pendiente from prestamos where id = ${id} and empresa_id = ${user.empresaId}`;
  if (!existingRows[0]) {
    res.status(404).json({ error: 'Préstamo no encontrado' });
    return;
  }
  const capitalPendiente = Number(existingRows[0].capital_pendiente);
  const { total } = calcPrestamo(Number(monto), Number(porciento), Number(cuotas), frecuencia);
  const cuota = capitalPendiente * (Number(porciento) / 100);

  const rows = await sql`
    update prestamos set
      nombre = ${nombre}, cedula = ${cedula || null}, monto = ${monto}, porciento = ${porciento},
      frecuencia = ${frecuencia}, cuotas = ${cuotas}, total_pagar = ${total}, cuota = ${cuota},
      fecha_inicio = ${fechaInicio || null}, updated_at = now()
    where id = ${id} and empresa_id = ${user.empresaId}
    returning id, nombre, cedula, monto, porciento, frecuencia, cuotas,
      total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
      capital_pendiente as "capitalPendiente", interes_pendiente as "interesPendiente",
      ultima_fecha_pago as "ultimaFechaPago", proxima_fecha_pago as "proximaFechaPago",
      fecha_inicio as "fechaInicio", estado, reenganche_de as "reenganchemDe"
  `;
  res.status(200).json({ prestamo: rows[0] });
}

async function eliminar(req, res, id) {
  const user = requireAdmin(req, res);
  if (!user) return;
  const rows = await sql`delete from prestamos where id = ${id} and empresa_id = ${user.empresaId} returning id`;
  if (!rows[0]) {
    res.status(404).json({ error: 'Préstamo no encontrado' });
    return;
  }
  res.status(200).json({ ok: true });
}

async function pagar(req, res, id) {
  const user = requireCajeroOrAdmin(req, res);
  if (!user) return;

  const montoPago = Number(req.body?.monto);
  const nota = (req.body?.nota || '').trim();
  if (!(montoPago > 0)) {
    res.status(400).json({ error: 'Ingrese un monto válido' });
    return;
  }

  const pool = getPool();
  const client = await pool.connect();
  let result;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `select capital_pendiente, interes_pendiente, ultima_fecha_pago, fecha_inicio,
         porciento, frecuencia, total_pagado
       from prestamos where id = $1 and empresa_id = $2 for update`,
      [id, user.empresaId]
    );
    const p = rows[0];
    const capitalActual = p ? Number(p.capital_pendiente) : 0;
    const interesActual = p ? Number(p.interes_pendiente) : 0;
    if (!p) {
      result = null;
    } else if (capitalActual + interesActual <= 0) {
      result = { yaPagado: true };
    } else {
      const fecha = new Date().toISOString().split('T')[0];
      const r = aplicarPagoRevolvente(
        {
          capitalPendiente: p.capital_pendiente,
          interesPendiente: p.interes_pendiente,
          ultimaFechaPago: p.ultima_fecha_pago,
          fechaInicio: p.fecha_inicio,
          porciento: p.porciento,
          frecuencia: p.frecuencia,
        },
        montoPago,
        fecha
      );
      const nuevoTotalPagado = Number(p.total_pagado) + r.aplicado;

      const updated = await client.query(
        `update prestamos set
           capital_pendiente = $1, interes_pendiente = $2, ultima_fecha_pago = $3,
           proxima_fecha_pago = $4, balance = $5, cuota = $6, total_pagado = $7, updated_at = now()
         where id = $8
         returning id, nombre, cedula, monto, porciento, frecuencia, cuotas,
           total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
           capital_pendiente as "capitalPendiente", interes_pendiente as "interesPendiente",
           ultima_fecha_pago as "ultimaFechaPago", proxima_fecha_pago as "proximaFechaPago",
           fecha_inicio as "fechaInicio", estado, reenganche_de as "reenganchemDe"`,
        [r.capitalPendiente, r.interesPendiente, r.ultimaFechaPago, r.proximaFechaPago, r.balance, r.cuota, nuevoTotalPagado, id]
      );
      const pagoRow = await client.query(
        `insert into pagos (prestamo_id, fecha, monto, nota, balance_tras)
         values ($1, $2, $3, $4, $5)
         returning id, fecha, monto, nota, balance_tras as "balanceTras"`,
        [id, fecha, r.aplicado, nota || 'Pago registrado', r.balance]
      );
      result = { prestamo: updated.rows[0], pago: pagoRow.rows[0], aplicado: r.aplicado };
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  if (!result) {
    res.status(404).json({ error: 'Préstamo no encontrado' });
    return;
  }
  if (result.yaPagado) {
    res.status(400).json({ error: 'Este préstamo ya está pagado completamente' });
    return;
  }
  res.status(200).json(result);
}

async function reenganchar(req, res, id) {
  const user = requireCajeroOrAdmin(req, res);
  if (!user) return;

  const original = (await sql`select id, nombre, cedula, balance from prestamos where id = ${id} and empresa_id = ${user.empresaId}`)[0];
  if (!original) {
    res.status(404).json({ error: 'Préstamo original no encontrado' });
    return;
  }
  if (Number(original.balance) > 0) {
    res.status(400).json({ error: 'El préstamo original aún no está pagado completamente (capital + interés pendiente)' });
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
  const fechaInicioFinal = fechaInicio || new Date().toISOString().split('T')[0];
  const proximaFechaPago = sumarPeriodo(fechaInicioFinal, frecuencia);
  const cuotaInicial = Number(monto) * (Number(porciento) / 100);

  const rows = await sql`
    insert into prestamos (
      empresa_id, nombre, cedula, monto, porciento, frecuencia, cuotas, total_pagar, cuota,
      balance, total_pagado, capital_pendiente, interes_pendiente, ultima_fecha_pago,
      proxima_fecha_pago, fecha_inicio, estado, reenganche_de
    )
    values (
      ${user.empresaId}, ${original.nombre}, ${original.cedula}, ${monto}, ${porciento}, ${frecuencia}, ${cuotas}, ${total}, ${cuotaInicial},
      ${monto}, 0, ${monto}, 0, ${fechaInicioFinal},
      ${proximaFechaPago}, ${fechaInicioFinal}, 'activo', ${id}
    )
    returning id, nombre, cedula, monto, porciento, frecuencia, cuotas,
      total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
      capital_pendiente as "capitalPendiente", interes_pendiente as "interesPendiente",
      ultima_fecha_pago as "ultimaFechaPago", proxima_fecha_pago as "proximaFechaPago",
      fecha_inicio as "fechaInicio", estado, reenganche_de as "reenganchemDe"
  `;
  const prestamo = { ...rows[0], historialPagos: [] };
  res.status(201).json({ prestamo });
}

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'PUT') return editar(req, res, id);
  if (req.method === 'DELETE') return eliminar(req, res, id);
  if (req.method === 'POST' && req.query.action === 'pago') return pagar(req, res, id);
  if (req.method === 'POST' && req.query.action === 'reenganche') return reenganchar(req, res, id);

  res.status(405).json({ error: 'Método no permitido' });
}
