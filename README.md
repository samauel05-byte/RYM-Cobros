# SEPI — Sistema de Préstamos y Cobros

Sistema web multi-empresa para gestionar préstamos informales: control de
clientes, cobros, mora e interés, con un panel independiente de super
administrador para crear y administrar empresas.

**En producción:** https://mr-cobros.vercel.app
**Panel de super administrador:** https://mr-cobros.vercel.app/admin

## Qué hace

- **Multi-empresa (multi-tenant):** cada empresa tiene su propio link, logo,
  usuarios y préstamos, completamente aislados entre sí.
- **Panel de super administrador** (`/admin`, no ligado a ninguna empresa):
  crear empresas nuevas (con el rol del primer usuario a elegir), ver el
  detalle de cada una (usuarios, clientes, capital prestado, saldo
  pendiente), crear usuarios y restablecer contraseñas sin tener que entrar
  a esa empresa.
- **Préstamos con modelo revolvente:** el capital prestado queda pendiente
  hasta saldarse por completo; el interés se acumula por período (diario,
  semanal o mensual) sobre el capital pendiente. Un abono cubre primero el
  interés/mora acumulado y el excedente reduce el capital. El "Reenganche"
  (renovar un préstamo) solo se habilita cuando el capital y el interés
  llegan a RD$0.
- **Roles de usuario por empresa:** administrador (acceso total), cajero
  (puede registrar pagos) y solo lectura.
- **Recibos imprimibles**, historial de pagos y próxima fecha de pago por
  cliente.
- Interfaz responsive (funciona en PC y celular).

## Stack técnico

- **Frontend:** un solo archivo (`index.html`) en HTML/CSS/JS sin
  frameworks.
- **Backend:** funciones serverless de [Vercel](https://vercel.com) en
  Node.js (carpeta `api/`).
- **Base de datos:** [Neon](https://neon.tech) (Postgres), vía
  `@neondatabase/serverless`.
- **Autenticación:** sesiones firmadas con HMAC-SHA256 (cookie httpOnly),
  contraseñas hasheadas con bcrypt.
- **Despliegue:** cada push a `main` despliega automáticamente a Vercel.

## Desarrollo local

```bash
npm install
```

Variables de entorno necesarias (configurarlas en Vercel → Project →
Settings → Environment Variables):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a la base de datos de Neon |
| `SESSION_SECRET` | Clave secreta para firmar las cookies de sesión |

El esquema de la base de datos está en `db/schema.sql`.

## Estructura del proyecto

```
index.html          → toda la interfaz (single-page app)
api/
  _lib/              → helpers compartidos (auth, base de datos, cálculo de préstamos)
  auth/[action].js   → login / logout / me
  empresas/          → listar/crear empresas, detalle, usuarios, super admin
  prestamos/         → crear, editar, eliminar, pagar, reenganchar
  usuarios/          → usuarios dentro de una empresa
  config.js          → logo por empresa
  state.js           → carga inicial de datos del usuario autenticado
db/schema.sql        → esquema de la base de datos
vercel.json          → rewrite para que las URLs de cada empresa sirvan la SPA
```

## Límite del plan de Vercel

El proyecto corre en el plan **Hobby** de Vercel, que permite un máximo de
12 funciones serverless por despliegue. Las rutas de `api/` están
consolidadas (varias acciones por archivo, usando `?action=` o el método
HTTP) para dejar margen a futuras funciones sin volver a chocar con ese
límite.
