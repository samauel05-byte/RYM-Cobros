type Montoide = number | string | { toString(): string };

type PrestamoConPagos = {
  monto: Montoide;
  tasaInteres: Montoide;
  pagos: { monto: Montoide }[];
};

export function montoTotal(prestamo: { monto: Montoide; tasaInteres: Montoide }) {
  const monto = Number(prestamo.monto);
  const tasa = Number(prestamo.tasaInteres);
  return monto * (1 + tasa / 100);
}

export function totalPagado(pagos: { monto: Montoide }[]) {
  return pagos.reduce((acc, p) => acc + Number(p.monto), 0);
}

export function saldoPendiente(prestamo: PrestamoConPagos) {
  return Math.max(0, montoTotal(prestamo) - totalPagado(prestamo.pagos));
}

export function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(valor);
}

export function formatoFecha(fecha: Date | string) {
  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(fecha));
}
