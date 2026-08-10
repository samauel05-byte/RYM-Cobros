import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatoMoneda, saldoPendiente } from "@/lib/calculos";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const clientes = await prisma.cliente.findMany({
    include: { prestamos: { include: { pagos: true } } },
    orderBy: { nombre: "asc" },
  });

  const filas = clientes.map((cliente) => {
    const prestamosActivos = cliente.prestamos.filter((p) => p.estado !== "PAGADO");
    const saldo = prestamosActivos.reduce((acc, p) => acc + saldoPendiente(p), 0);
    return { cliente, saldo, prestamosActivos: prestamosActivos.length };
  });

  const totalPendiente = filas.reduce((acc, f) => acc + f.saldo, 0);
  const totalClientesConDeuda = filas.filter((f) => f.saldo > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total pendiente de cobro</p>
          <p className="mt-1 text-2xl font-semibold">{formatoMoneda(totalPendiente)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Clientes con deuda</p>
          <p className="mt-1 text-2xl font-semibold">{totalClientesConDeuda}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total de clientes</p>
          <p className="mt-1 text-2xl font-semibold">{clientes.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Clientes</h2>
        <Link
          href="/clientes"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
        >
          Nuevo cliente
        </Link>
      </div>

      {filas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no hay clientes registrados.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Préstamos activos</th>
                <th className="px-4 py-2 font-medium">Saldo pendiente</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ cliente, saldo, prestamosActivos }) => (
                <tr key={cliente.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">
                    <Link href={`/clientes/${cliente.id}`} className="hover:underline">
                      {cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{prestamosActivos}</td>
                  <td className="px-4 py-2 font-medium">
                    {saldo > 0 ? formatoMoneda(saldo) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
