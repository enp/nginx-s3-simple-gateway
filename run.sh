#!/bin/sh

envsubst \$RESOLVER,\$S3_ENDPOINT,\$S3_BUCKET < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g "daemon off;"
