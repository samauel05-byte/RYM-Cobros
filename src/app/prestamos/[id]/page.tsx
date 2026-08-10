import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registrarPago } from "@/app/actions";
import { formatoMoneda, formatoFecha, montoTotal, totalPagado, saldoPendiente } from "@/lib/calculos";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  PAGADO: "Pagado",
  ATRASADO: "Atrasado",
};

export default async function PrestamoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prestamo = await prisma.prestamo.findUnique({
    where: { id },
    include: { cliente: true, pagos: { orderBy: { fecha: "desc" } } },
  });

  if (!prestamo) notFound();

  const total = montoTotal(prestamo);
  const pagado = totalPagado(prestamo.pagos);
  const saldo = saldoPendiente(prestamo);
  const registrarPagoDelPrestamo = registrarPago.bind(null, prestamo.id);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/clientes/${prestamo.clienteId}`} className="text-sm text-neutral-500 hover:underline">
          ← {prestamo.cliente.nombre}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          Préstamo del {formatoFecha(prestamo.fechaPrestamo)}
        </h1>
        <p className="text-sm text-neutral-500">Estado: {ESTADO_LABEL[prestamo.estado]}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Monto prestado</p>
          <p className="mt-1 text-lg font-semibold">{formatoMoneda(Number(prestamo.monto))}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total a pagar</p>
          <p className="mt-1 text-lg font-semibold">{formatoMoneda(total)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Pagado</p>
          <p className="mt-1 text-lg font-semibold">{formatoMoneda(pagado)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Saldo pendiente</p>
          <p className="mt-1 text-lg font-semibold">{formatoMoneda(saldo)}</p>
        </div>
      </div>

      {prestamo.notas && (
        <p className="text-sm text-neutral-600">
          <span className="font-medium">Notas:</span> {prestamo.notas}
        </p>
      )}

      <div>
        <h2 className="text-lg font-semibold">Pagos</h2>
        {prestamo.pagos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavía no hay pagos registrados.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {prestamo.pagos.map((pago) => (
                  <tr key={pago.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2">{formatoFecha(pago.fecha)}</td>
                    <td className="px-4 py-2">{formatoMoneda(Number(pago.monto))}</td>
                    <td className="px-4 py-2 text-neutral-500">{pago.notas ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {saldo > 0 && (
        <div>
          <h2 className="text-lg font-semibold">Registrar pago</h2>
          <form
            action={registrarPagoDelPrestamo}
            className="mt-4 max-w-md space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div>
              <label className="block text-sm font-medium text-neutral-700" htmlFor="monto">
                Monto
              </label>
              <input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                min="0.01"
                max={saldo}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700" htmlFor="notas">
                Notas
              </label>
              <input
                id="notas"
                name="notas"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
            >
              Registrar pago
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
