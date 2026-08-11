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

export function validatePrestamoInput(body) {
  const { nombre, cedula, monto, porciento, cuotas, frecuencia, fechaInicio } = body;
  if (!nombre || typeof nombre !== 'string') return 'nombre es requerido';
  if (!['diario', 'semanal', 'mensual'].includes(frecuencia)) return 'frecuencia inválida';
  if (!(monto > 0)) return 'monto debe ser mayor a 0';
  if (!(porciento > 0)) return 'porciento debe ser mayor a 0';
  if (!Number.isInteger(cuotas) || cuotas <= 0) return 'cuotas debe ser un entero mayor a 0';
  return null;
}
