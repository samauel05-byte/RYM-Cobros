-- Sepi - esquema (Neon Postgres) - multi-empresa

CREATE TABLE IF NOT EXISTS empresas (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  logo_data_url  TEXT,
  es_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id              SERIAL PRIMARY KEY,
  empresa_id      INTEGER NOT NULL REFERENCES empresas(id),
  nombre          TEXT NOT NULL,
  usuario         TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'cajero', 'viewer')),
  is_super_admin  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_empresa_usuario_key UNIQUE (empresa_id, usuario)
);

CREATE TABLE IF NOT EXISTS prestamos (
  id             SERIAL PRIMARY KEY,
  empresa_id     INTEGER NOT NULL REFERENCES empresas(id),
  nombre         TEXT NOT NULL,
  cedula         TEXT,
  monto          NUMERIC(14,2) NOT NULL,
  porciento      NUMERIC(6,2) NOT NULL,
  frecuencia     TEXT NOT NULL CHECK (frecuencia IN ('diario', 'semanal', 'mensual')),
  cuotas         INTEGER NOT NULL,
  total_pagar    NUMERIC(14,2) NOT NULL,
  cuota          NUMERIC(14,2) NOT NULL,
  balance        NUMERIC(14,2) NOT NULL,
  total_pagado   NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_inicio   DATE,
  estado         TEXT NOT NULL DEFAULT 'activo',
  reenganche_de  INTEGER REFERENCES prestamos(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
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
