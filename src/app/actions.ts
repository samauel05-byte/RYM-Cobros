"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function crearCliente(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();

  if (!nombre) {
    throw new Error("El nombre es obligatorio");
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombre,
      telefono: telefono || null,
      direccion: direccion || null,
    },
  });

  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function crearPrestamo(clienteId: string, formData: FormData) {
  const monto = Number(formData.get("monto"));
  const tasaInteres = Number(formData.get("tasaInteres") ?? 0);
  const fechaVencimientoRaw = String(formData.get("fechaVencimiento") ?? "");
  const notas = String(formData.get("notas") ?? "").trim();

  if (!monto || monto <= 0) {
    throw new Error("El monto debe ser mayor a cero");
  }

  await prisma.prestamo.create({
    data: {
      clienteId,
      monto,
      tasaInteres: Number.isFinite(tasaInteres) ? tasaInteres : 0,
      fechaVencimiento: fechaVencimientoRaw ? new Date(fechaVencimientoRaw) : null,
      notas: notas || null,
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

export async function registrarPago(prestamoId: string, formData: FormData) {
  const monto = Number(formData.get("monto"));
  const notas = String(formData.get("notas") ?? "").trim();

  if (!monto || monto <= 0) {
    throw new Error("El monto del pago debe ser mayor a cero");
  }

  const pago = await prisma.pago.create({
    data: {
      prestamoId,
      monto,
      notas: notas || null,
    },
    include: { prestamo: { include: { pagos: true } } },
  });

  const { prestamo } = pago;
  const montoTotal = Number(prestamo.monto) * (1 + Number(prestamo.tasaInteres) / 100);
  const totalPagado = prestamo.pagos.reduce(
    (acc: number, p: { monto: unknown }) => acc + Number(p.monto),
    0,
  );

  if (totalPagado >= montoTotal && prestamo.estado !== "PAGADO") {
    await prisma.prestamo.update({
      where: { id: prestamoId },
      data: { estado: "PAGADO" },
    });
  }

  revalidatePath(`/prestamos/${prestamoId}`);
  revalidatePath(`/clientes/${prestamo.clienteId}`);
}
