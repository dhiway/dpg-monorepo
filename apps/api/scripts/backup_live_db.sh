#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
api_dir="$(cd "$script_dir/.." && pwd)"
backup_dir="${BACKUP_DIR:-$api_dir/backups}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Usage: bash scripts/backup_live_db.sh [output_file]

Creates a pg_dump backup using either POSTGRES_URL or POSTGRES_* env vars.

Environment overrides:
  PG_DUMP_BIN           Path to a specific pg_dump binary
  PG_DUMP_DOCKER_IMAGE  Docker image to use for pg_dump fallback

Examples:
  pnpm backup:live-db
  pnpm backup:live-db -- /tmp/pre-migration.dump
  POSTGRES_URL='postgres://user:pass@127.0.0.1:6543/db' pnpm backup:live-db
EOF
  exit 0
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
default_file="$backup_dir/live-db-$timestamp.dump"
output_file="${1:-$default_file}"
docker_image="${PG_DUMP_DOCKER_IMAGE:-postgres:18}"

mkdir -p "$backup_dir"

if [[ -n "${POSTGRES_URL:-}" ]]; then
  connection_args=("$POSTGRES_URL")
else
  : "${POSTGRES_USER:?POSTGRES_USER is required when POSTGRES_URL is not set}"
  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required when POSTGRES_URL is not set}"
  : "${POSTGRES_DB:?POSTGRES_DB is required when POSTGRES_URL is not set}"

  pg_host="${POSTGRES_HOST:-127.0.0.1}"
  pg_port="${POSTGRES_PORT:-${DATABASE_PORT:-6543}}"

  connection_args=(
    "--host=$pg_host"
    "--port=$pg_port"
    "--username=$POSTGRES_USER"
    "--dbname=$POSTGRES_DB"
  )

  export PGPASSWORD="$POSTGRES_PASSWORD"
fi

pick_pg_dump_command() {
  if [[ -n "${PG_DUMP_BIN:-}" ]]; then
    printf '%s\n' "$PG_DUMP_BIN"
    return 0
  fi

  if command -v pg_dump >/dev/null 2>&1; then
    printf '%s\n' "$(command -v pg_dump)"
    return 0
  fi

  return 1
}

run_pg_dump_binary() {
  local pg_dump_bin="$1"

  "$pg_dump_bin" \
    --format=custom \
    --verbose \
    --file "$output_file" \
    "${connection_args[@]}"
}

run_pg_dump_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi

  local docker_host
  docker_host="host.docker.internal"

  if [[ "$(uname -s)" == "Linux" ]]; then
    docker_host="172.17.0.1"
  fi

  local docker_args=()

  if [[ -n "${POSTGRES_URL:-}" ]]; then
    local docker_url
    docker_url="$POSTGRES_URL"
    docker_url="${docker_url/@127.0.0.1:/@${docker_host}:}"
    docker_url="${docker_url/@localhost:/@${docker_host}:}"

    docker_args=("$docker_url")
  else
    docker_args=(
      "--host=$docker_host"
      "--port=${POSTGRES_PORT:-${DATABASE_PORT:-6543}}"
      "--username=$POSTGRES_USER"
      "--dbname=$POSTGRES_DB"
    )
  fi

  docker run --rm \
    -e PGPASSWORD="${POSTGRES_PASSWORD:-}" \
    -v "$backup_dir:$backup_dir" \
    "$docker_image" \
    pg_dump \
    --format=custom \
    --verbose \
    --file "$output_file" \
    "${docker_args[@]}"
}

echo "Creating database dump at $output_file"

pg_dump_bin="$(pick_pg_dump_command || true)"

if [[ -n "$pg_dump_bin" ]]; then
  if ! run_pg_dump_binary "$pg_dump_bin"; then
    if [[ -f "$output_file" ]]; then
      rm -f "$output_file"
    fi

    if ! run_pg_dump_docker; then
      echo "Backup failed with local pg_dump and Docker fallback was unavailable." >&2
      exit 1
    fi
  fi
else
  if ! run_pg_dump_docker; then
    echo "No local pg_dump found and Docker fallback was unavailable." >&2
    exit 1
  fi
fi

echo "Database dump completed: $output_file"
