#!/usr/bin/env bash
set -euo pipefail

DB_NAME="maestro_dev"
DB_USER="postgres"
PORT="5432"

function ensure_postgres_ready {
  if command -v pg_isready >/dev/null; then
    if pg_isready -p "${PORT}" -U "${DB_USER}" >/dev/null 2>&1; then
      return 0
    fi
  fi

  if command -v brew >/dev/null; then
    echo "Iniciando PostgreSQL via brew services..."
    brew services start postgresql >/dev/null 2>&1
    until pg_isready -p "${PORT}" -U "${DB_USER}" >/dev/null 2>&1; do
      sleep 1
    done
    return 0
  fi

  echo "PostgreSQL não está respondendo em localhost:${PORT}."
  echo "Instale o PostgreSQL (Homebrew ou manual) ou execute um container Docker"
  echo "e certifique-se de que pg_isready -p ${PORT} -U ${DB_USER} retorna OK antes de continuar."
  exit 1
}

function ensure_database {
  if ! command -v psql >/dev/null; then
    echo "psql não encontrado; instale o cliente PostgreSQL."
    exit 1
  fi

  if ! psql -p "${PORT}" -U "${DB_USER}" -c '\l' >/dev/null 2>&1; then
    echo "Conectado ao servidor, criando database ${DB_NAME}..."
    createdb -p "${PORT}" -U "${DB_USER}" "${DB_NAME}"
  fi
}

ensure_postgres_ready
ensure_database

echo "Banco pronto em localhost:${PORT}"
echo "Aplicando migrations e seed..."
npx prisma migrate reset --skip-generate --force

echo "Banco configurado. Rode 'npm run dev' para iniciar o app."
