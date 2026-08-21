import { sql } from '../_lib/db.js';
import { requireUser, requireCajeroOrAdmin } from '../_lib/auth.js';
import { calcPrestamo, validatePrestamoInput, sumarPeriodo } from '../_lib/calc.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    const prestamos = await sql`
      select
        p.id, p.nombre, p.cedula, p.monto, p.porciento, p.frecuencia, p.cuotas,
        p.total_pagar as "totalPagar", p.cuota, p.balance, p.total_pagado as "totalPagado",
        p.capital_pendiente as "capitalPendiente", p.interes_pendiente as "interesPendiente",
        p.ultima_fecha_pago as "ultimaFechaPago", p.proxima_fecha_pago as "proximaFechaPago",
        p.fecha_inicio as "fechaInicio", p.estado, p.reenganche_de as "reenganchemDe",
        coalesce(
          (select json_agg(json_build_object(
              'id', pg.id, 'fecha', pg.fecha, 'monto', pg.monto,
              'nota', pg.nota, 'balanceTras', pg.balance_tras
            ) order by pg.id)
           from pagos pg where pg.prestamo_id = p.id),
          '[]'::json
        ) as "historialPagos"
      from prestamos p
      where p.empresa_id = ${user.empresaId}
      order by p.id
    `;
    res.status(200).json({ prestamos });
    return;
  }

  if (req.method === 'POST') {
    const user = requireCajeroOrAdmin(req, res);
    if (!user) return;

    const body = req.body || {};
    const err = validatePrestamoInput(body);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
    const { nombre, cedula, monto, porciento, cuotas, frecuencia, fechaInicio } = body;
    const { total } = calcPrestamo(Number(monto), Number(porciento), Number(cuotas), frecuencia);
    const fechaInicioFinal = fechaInicio || new Date().toISOString().split('T')[0];
    const proximaFechaPago = sumarPeriodo(fechaInicioFinal, frecuencia);
    const cuotaInicial = Number(monto) * (Number(porciento) / 100);

    // Modelo revolvente: al crear, el capital queda pendiente por completo y aún
    // no se ha acumulado interés (0 períodos transcurridos) — balance = monto.
    const rows = await sql`
      insert into prestamos (
        empresa_id, nombre, cedula, monto, porciento, frecuencia, cuotas, total_pagar, cuota,
        balance, total_pagado, capital_pendiente, interes_pendiente, ultima_fecha_pago,
        proxima_fecha_pago, fecha_inicio, estado
      )
      values (
        ${user.empresaId}, ${nombre}, ${cedula || null}, ${monto}, ${porciento}, ${frecuencia}, ${cuotas}, ${total}, ${cuotaInicial},
        ${monto}, 0, ${monto}, 0, ${fechaInicioFinal},
        ${proximaFechaPago}, ${fechaInicioFinal}, 'activo'
      )
      returning id, nombre, cedula, monto, porciento, frecuencia, cuotas,
        total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
        capital_pendiente as "capitalPendiente", interes_pendiente as "interesPendiente",
        ultima_fecha_pago as "ultimaFechaPago", proxima_fecha_pago as "proximaFechaPago",
        fecha_inicio as "fechaInicio", estado, reenganche_de as "reenganchemDe"
    `;
    const prestamo = { ...rows[0], historialPagos: [] };
    res.status(201).json({ prestamo });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
