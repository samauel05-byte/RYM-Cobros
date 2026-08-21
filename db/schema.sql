-- Sepi - esquema (Neon Postgres) - multi-empresa

CREATE TABLE IF NOT EXISTS empresas (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  logo_data_url  TEXT,
  es_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- empresa_id es NULL únicamente para cuentas de plataforma (super admin) que no
-- pertenecen a ninguna empresa — entran por el link reservado /admin.
CREATE TABLE IF NOT EXISTS usuarios (
  id              SERIAL PRIMARY KEY,
  empresa_id      INTEGER REFERENCES empresas(id),
  nombre          TEXT NOT NULL,
  usuario         TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'cajero', 'viewer')),
  is_super_admin  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_empresa_usuario_key UNIQUE (empresa_id, usuario)
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_platform_usuario_key ON usuarios (usuario) WHERE empresa_id IS NULL;

-- Modelo revolvente: el capital (monto) queda como deuda pendiente indefinidamente
-- hasta saldarse por completo; el interés se acumula por período sobre
-- capital_pendiente y se cobra aparte. balance = capital_pendiente + interes_pendiente
-- (columna calculada en cada respuesta de la API, no almacenada). Reenganche solo
-- disponible cuando capital_pendiente + interes_pendiente = 0.
CREATE TABLE IF NOT EXISTS prestamos (
  id                  SERIAL PRIMARY KEY,
  empresa_id          INTEGER NOT NULL REFERENCES empresas(id),
  nombre              TEXT NOT NULL,
  cedula              TEXT,
  monto               NUMERIC(14,2) NOT NULL,
  porciento           NUMERIC(6,2) NOT NULL,
  frecuencia          TEXT NOT NULL CHECK (frecuencia IN ('diario', 'semanal', 'mensual')),
  cuotas              INTEGER NOT NULL,
  total_pagar         NUMERIC(14,2) NOT NULL,
  cuota               NUMERIC(14,2) NOT NULL,
  balance             NUMERIC(14,2) NOT NULL,
  total_pagado        NUMERIC(14,2) NOT NULL DEFAULT 0,
  capital_pendiente   NUMERIC(14,2) NOT NULL,
  interes_pendiente   NUMERIC(14,2) NOT NULL DEFAULT 0,
  ultima_fecha_pago   DATE,
  proxima_fecha_pago  DATE,
  fecha_inicio        DATE,
  estado              TEXT NOT NULL DEFAULT 'activo',
  reenganche_de       INTEGER REFERENCES prestamos(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagos (
  id            SERIAL PRIMARY KEY,
  prestamo_id   INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  monto         NUMERIC(14,2) NOT NULL,
  nota          TEXT,
  balance_tras  NUMERIC(14,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_prestamo_id ON pagos(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_nombre ON prestamos(nombre);
CREATE INDEX IF NOT EXISTS idx_prestamos_empresa_id ON prestamos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON usuarios(empresa_id);
