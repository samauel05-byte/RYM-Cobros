-- RYM Soluciones - esquema inicial (Neon Postgres)

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL,
  usuario       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'cajero', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prestamos (
  id             SERIAL PRIMARY KEY,
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

-- Fila única con configuración global (logo, etc.) visible para todos los usuarios
CREATE TABLE IF NOT EXISTS app_config (
  id             SMALLINT PRIMARY KEY DEFAULT 1,
  logo_data_url  TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id = 1)
);
INSERT INTO app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
