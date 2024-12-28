FROM nginx

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY gateway.js /etc/nginx/njs/gateway.js
COPY run.sh /run.sh

ENV RESOLVER="1.1.1.1 ipv6=off"
ENV S3_ENDPOINT="http://storage.yandexcloud.net"
ENV S3_REGION="ru-central1"
ENV S3_BUCKET="arenadata-internal-repo"

ENTRYPOINT [ "./run.sh" ]
