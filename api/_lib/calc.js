// Debe permanecer idéntico a calcPrestamo() en index.html
export function calcPrestamo(monto, porciento, cuotas, frecuencia) {
  const rate = porciento / 100;
  const cuotaBase = monto * rate;
  const total = cuotaBase * cuotas;

  let rateDiario, rateSemanal, rateMensual;
  if (frecuencia === 'semanal') {
    rateSemanal = rate;
    rateDiario = rate / 7;
    rateMensual = rate * (30 / 7);
  } else if (frecuencia === 'diario') {
    rateDiario = rate;
    rateSemanal = rate * 7;
    rateMensual = rate * 30;
  } else {
    rateMensual = rate;
    rateSemanal = rate / (30 / 7);
    rateDiario = rate / 30;
  }

  const dias = frecuencia === 'diario' ? cuotas : frecuencia === 'semanal' ? cuotas * 7 : cuotas * 30;
  const cuotasDiario = dias;
  const cuotasSemanal = Math.round(dias / 7);
  const cuotasMensual = Math.round(dias / 30) || 1;

  const diario = { cuotas: cuotasDiario, cuota: monto * rateDiario, total: monto * rateDiario * cuotasDiario };
  const semanal = { cuotas: cuotasSemanal, cuota: monto * rateSemanal, total: monto * rateSemanal * cuotasSemanal };
  const mensual = { cuotas: cuotasMensual, cuota: monto * rateMensual, total: monto * rateMensual * cuotasMensual };

  const cuota = frecuencia === 'diario' ? diario.cuota : frecuencia === 'semanal' ? semanal.cuota : mensual.cuota;
  const total2 = frecuencia === 'diario' ? diario.total : frecuencia === 'semanal' ? semanal.total : mensual.total;

  return { cuota, total: total2, diario, semanal, mensual };
}

export const DIAS_POR_PERIODO = { diario: 1, semanal: 7, mensual: 30 };

export function sumarPeriodo(fechaStr, frecuencia) {
  const dias = DIAS_POR_PERIODO[frecuencia] || 30;
  const f = new Date(fechaStr);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().split('T')[0];
}

// Modelo revolvente: el capital (monto) queda como deuda pendiente indefinidamente
// hasta saldarse por completo; el interés se acumula por período sobre
// capital_pendiente, anclado a ultimaFechaPago (o fechaInicio si aún no hay pagos).
// Debe permanecer idéntico a la versión en index.html (interesAdeudadoJS/aplicarPagoRevolventeJS).
export function interesAdeudado(prestamo, fechaHoyStr) {
  const rate = Number(prestamo.porciento) / 100;
  const dias = DIAS_POR_PERIODO[prestamo.frecuencia] || 30;
  const ancla = new Date(prestamo.ultimaFechaPago || prestamo.fechaInicio);
  const hoy = new Date(fechaHoyStr);
  const diasTranscurridos = Math.floor((hoy - ancla) / 86400000);
  const periodos = Math.max(0, Math.floor(diasTranscurridos / dias));
  const interesNuevo = Number(prestamo.capitalPendiente) * rate * periodos;
  const totalAdeudado = Number(prestamo.interesPendiente) + interesNuevo;
  return { periodos, interesNuevo, totalAdeudado };
}

// Aplica un pago: primero cubre el interés acumulado (interesAdeudado); el excedente
// abona a capital. Si no alcanza a cubrir el interés, el faltante queda como
// interés pendiente (mora) y la fecha de referencia NO avanza al día de hoy —
// solo avanza por los períodos que sí quedaron cubiertos, para no perder el resto.
export function aplicarPagoRevolvente(prestamo, montoPagoSolicitado, fechaPagoStr) {
  const rate = Number(prestamo.porciento) / 100;
  const dias = DIAS_POR_PERIODO[prestamo.frecuencia] || 30;
  const ancla = new Date(prestamo.ultimaFechaPago || prestamo.fechaInicio);
  const { periodos, totalAdeudado } = interesAdeudado(prestamo, fechaPagoStr);
  const capitalOriginal = Number(prestamo.capitalPendiente);

  // Nunca se aplica más de lo que realmente se debe (capital + interés): el
  // excedente de un pago que salda todo no desaparece, simplemente no se aplica.
  const deudaTotal = capitalOriginal + totalAdeudado;
  const aplicado = Math.min(montoPagoSolicitado, deudaTotal);

  let capitalPendiente = capitalOriginal;
  let interesPendiente, ultimaFechaPago;

  if (aplicado <= totalAdeudado) {
    interesPendiente = totalAdeudado - aplicado;
    const nuevaAncla = new Date(ancla);
    nuevaAncla.setUTCDate(nuevaAncla.getUTCDate() + periodos * dias);
    ultimaFechaPago = nuevaAncla.toISOString().split('T')[0];
  } else {
    const abonoCapital = aplicado - totalAdeudado;
    capitalPendiente = Math.max(0, capitalOriginal - abonoCapital);
    interesPendiente = 0;
    ultimaFechaPago = fechaPagoStr;
  }

  const balance = capitalPendiente + interesPendiente;
  let proximaFechaPago = null;
  if (balance > 0) {
    const f = new Date(ultimaFechaPago);
    f.setUTCDate(f.getUTCDate() + dias);
    proximaFechaPago = f.toISOString().split('T')[0];
  }
  const cuota = capitalPendiente * rate;

  return { capitalPendiente, interesPendiente, ultimaFechaPago, proximaFechaPago, balance, cuota, aplicado };
}

export function validatePrestamoInput(body) {
  const { nombre, cedula, monto, porciento, cuotas, frecuencia, fechaInicio } = body;
  if (!nombre || typeof nombre !== 'string') return 'nombre es requerido';
  if (!['diario', 'semanal', 'mensual'].includes(frecuencia)) return 'frecuencia inválida';
  if (!(monto > 0)) return 'monto debe ser mayor a 0';
  if (!(porciento > 0)) return 'porciento debe ser mayor a 0';
  if (!Number.isInteger(cuotas) || cuotas <= 0) return 'cuotas debe ser un entero mayor a 0';
  return null;
}
