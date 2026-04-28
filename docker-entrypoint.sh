#!/bin/sh
set -e

mkdir -p /usr/share/nginx/html/assets/config

cat > /usr/share/nginx/html/assets/config/app-config.json <<EOF
{
  "apiBaseUrl": "${API_BASE_URL}",
  "wsBaseUrl": "${WS_BASE_URL}"
}
EOF

exec nginx -g 'daemon off;'
