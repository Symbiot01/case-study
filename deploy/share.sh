#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

cmd="${1:-up}"

url_from_logs() {
  docker compose logs tunnel 2>/dev/null \
    | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
    | tail -1 || true
}

case "$cmd" in
  up)
    docker compose up -d
    echo "Waiting for the public URL..."
    for _ in $(seq 1 40); do
      url="$(url_from_logs)"
      if [[ -n "$url" ]]; then
        echo "$url"
        exit 0
      fi
      sleep 1
    done
    echo "Tunnel is running, but the URL is not in the logs yet." >&2
    echo "Check: docker compose -f deploy/docker-compose.yml logs tunnel" >&2
    exit 1
    ;;
  down)
    docker compose down
    ;;
  url)
    url="$(url_from_logs)"
    if [[ -z "$url" ]]; then
      echo "No public URL yet." >&2
      exit 1
    fi
    echo "$url"
    ;;
  *)
    echo "usage: share.sh [up|down|url]" >&2
    exit 1
    ;;
esac
