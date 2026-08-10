import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { crearPrestamo } from "@/app/actions";
import { formatoMoneda, formatoFecha, saldoPendiente } from "@/lib/calculos";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  PAGADO: "Pagado",
  ATRASADO: "Atrasado",
};

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { prestamos: { include: { pagos: true }, orderBy: { fechaPrestamo: "desc" } } },
  });

  if (!cliente) notFound();

  const crearPrestamoConCliente = crearPrestamo.bind(null, cliente.id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/clientes" className="text-sm text-neutral-500 hover:underline">
          ← Clientes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{cliente.nombre}</h1>
        <p className="text-sm text-neutral-500">
          {[cliente.telefono, cliente.direccion].filter(Boolean).join(" · ") || "Sin datos de contacto"}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Préstamos</h2>
        {cliente.prestamos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavía no tiene préstamos.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Interés</th>
                  <th className="px-4 py-2 font-medium">Saldo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cliente.prestamos.map((prestamo) => (
                  <tr key={prestamo.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2">
                      <Link href={`/prestamos/${prestamo.id}`} className="hover:underline">
                        {formatoFecha(prestamo.fechaPrestamo)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{formatoMoneda(Number(prestamo.monto))}</td>
                    <td className="px-4 py-2">{Number(prestamo.tasaInteres)}%</td>
                    <td className="px-4 py-2 font-medium">
                      {formatoMoneda(saldoPendiente(prestamo))}
                    </td>
                    <td className="px-4 py-2">{ESTADO_LABEL[prestamo.estado]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Nuevo préstamo</h2>
        <form
          action={crearPrestamoConCliente}
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
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="tasaInteres">
              Tasa de interés (%)
            </label>
            <input
              id="tasaInteres"
              name="tasaInteres"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="fechaVencimiento">
              Fecha de vencimiento
            </label>
            <input
              id="fechaVencimiento"
              name="fechaVencimiento"
              type="date"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="notas">
              Notas
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={2}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
          >
            Registrar préstamo
          </button>
        </form>
      </div>
    </div>
  );
}
