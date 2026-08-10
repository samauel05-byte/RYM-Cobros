import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { crearCliente } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Clientes</h1>
        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {clientes.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">Todavía no hay clientes.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {clientes.map((cliente) => (
                <li key={cliente.id} className="px-4 py-3">
                  <Link href={`/clientes/${cliente.id}`} className="hover:underline">
                    {cliente.nombre}
                  </Link>
                  {cliente.telefono && (
                    <span className="ml-2 text-sm text-neutral-500">{cliente.telefono}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Nuevo cliente</h2>
        <form action={crearCliente} className="mt-4 max-w-md space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="telefono">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="direccion">
              Dirección
            </label>
            <input
              id="direccion"
              name="direccion"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
          >
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
