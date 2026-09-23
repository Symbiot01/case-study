#!/bin/sh
# Official minio/mc is a scratch image, so this runs mcli from Alpine.
set -eu

apk add --no-cache minio-client

: "${MINIO_ROOT_USER:?}"
: "${MINIO_ROOT_PASSWORD:?}"
: "${S3_ACCESS_KEY:?}"
: "${S3_SECRET_KEY:?}"
: "${S3_BUCKET:?}"

mcli alias set local "http://minio:9000" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mcli mb --ignore-existing "local/${S3_BUCKET}"
mcli anonymous set none "local/${S3_BUCKET}"

run_ok_if_already() {
  if output=$("$@" 2>&1); then
    printf '%s\n' "$output"
    return 0
  fi
  printf '%s\n' "$output" >&2
  printf '%s\n' "$output" | grep -qi "already" && return 0
  return 1
}

run_ok_if_already mcli admin user add local "$S3_ACCESS_KEY" "$S3_SECRET_KEY"
run_ok_if_already mcli admin policy create local product-images /policy.json
run_ok_if_already mcli admin policy attach local product-images --user "$S3_ACCESS_KEY"
