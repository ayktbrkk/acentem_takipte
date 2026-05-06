#!/usr/bin/env sh
set -eu

required_vars="BACKEND SOCKETIO FRAPPE_SITE_NAME_HEADER"

for name in $required_vars; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

export UPSTREAM_REAL_IP_ADDRESS="${UPSTREAM_REAL_IP_ADDRESS:-127.0.0.1}"
export UPSTREAM_REAL_IP_HEADER="${UPSTREAM_REAL_IP_HEADER:-X-Forwarded-For}"
export UPSTREAM_REAL_IP_RECURSIVE="${UPSTREAM_REAL_IP_RECURSIVE:-off}"
export PROXY_READ_TIMEOUT="${PROXY_READ_TIMEOUT:-120}"
export CLIENT_MAX_BODY_SIZE="${CLIENT_MAX_BODY_SIZE:-50m}"

python3 /usr/local/bin/sync-assets-manifest.py

envsubst '${BACKEND} ${SOCKETIO} ${FRAPPE_SITE_NAME_HEADER} ${UPSTREAM_REAL_IP_ADDRESS} ${UPSTREAM_REAL_IP_HEADER} ${UPSTREAM_REAL_IP_RECURSIVE} ${PROXY_READ_TIMEOUT} ${CLIENT_MAX_BODY_SIZE}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
