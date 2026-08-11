import { getPool } from '../../_lib/db.js';
import { requireCajeroOrAdmin } from '../../_lib/auth.js';

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
      'select balance, total_pagado from prestamos where id = $1 for update',
      [id]
    );
    const p = rows[0];
    if (!p) {
      result = null;
    } else if (Number(p.balance) <= 0) {
      result = { yaPagado: true };
    } else {
      const balanceActual = Number(p.balance);
      const aplicado = Math.min(montoPago, balanceActual);
      const nuevoBalance = Math.max(0, balanceActual - aplicado);
      const nuevoTotalPagado = Number(p.total_pagado) + aplicado;
      const fecha = new Date().toISOString().split('T')[0];

      const updated = await client.query(
        `update prestamos set balance = $1, total_pagado = $2, updated_at = now()
         where id = $3
         returning id, nombre, cedula, monto, porciento, frecuencia, cuotas,
           total_pagar as "totalPagar", cuota, balance, total_pagado as "totalPagado",
           fecha_inicio as "fechaInicio", estado, reenganche_de as "reenganchemDe"`,
        [nuevoBalance, nuevoTotalPagado, id]
      );
      const pagoRow = await client.query(
        `insert into pagos (prestamo_id, fecha, monto, nota, balance_tras)
         values ($1, $2, $3, $4, $5)
         returning id, fecha, monto, nota, balance_tras as "balanceTras"`,
        [id, fecha, aplicado, nota || 'Pago registrado', nuevoBalance]
      );
      result = { prestamo: updated.rows[0], pago: pagoRow.rows[0], aplicado };
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
