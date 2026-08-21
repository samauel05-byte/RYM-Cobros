import { sql } from './_lib/db.js';
import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
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

  let users = [];
  if (user.role === 'admin') {
    users = await sql`select id, nombre, usuario as "user", role from usuarios where empresa_id = ${user.empresaId} order by id`;
  }

  res.status(200).json({ prestamos, users });
}
