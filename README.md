# RYM Cobros

Sistema de cobros y préstamos informales: registro de clientes, préstamos (con
interés opcional) y pagos, con cálculo automático de saldo pendiente.

## Stack

- [Next.js](https://nextjs.org) (App Router) + Tailwind CSS
- [Prisma](https://www.prisma.io) + Postgres
- Pensado para desplegarse gratis en [Render](https://render.com), con la base
  de datos en [Neon](https://neon.tech)

## Desarrollo local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear un archivo `.env` (basado en `.env.example`) con la connection
   string de tu base de datos Postgres (por ejemplo, un proyecto de Neon):

   ```bash
   cp .env.example .env
   ```

3. Aplicar las migraciones:

   ```bash
   npx prisma migrate deploy
   ```

4. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

## Despliegue (Neon + Render)

1. **Base de datos (Neon)**: crear un proyecto gratuito en
   [neon.tech](https://neon.tech) y copiar la connection string.
2. **Hosting (Render)**: crear un *Web Service* nuevo en
   [render.com](https://render.com) conectado a este repositorio (usa el
   `render.yaml` incluido). Configurar la variable de entorno `DATABASE_URL`
   con la connection string de Neon.
3. Render corre `npm install && npm run build` (que genera el cliente de
   Prisma y aplica las migraciones) y luego `npm start`.

## Modelo de datos

- **Cliente**: nombre, teléfono, dirección.
- **Préstamo**: monto, tasa de interés (%), fecha, vencimiento, estado
  (activo / pagado / atrasado), asociado a un cliente.
- **Pago**: monto, fecha, notas, asociado a un préstamo. El saldo pendiente
  se calcula como `monto * (1 + tasaInteres / 100) - suma de pagos`.
