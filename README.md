# Nginx S3 simple gateway

Nginx-based service for read-only access to S3 bucket with nginx-like directory index

How to use:

```
docker run -it --rm -p 80:80 \
    -e S3_ENDPOINT=<..> \
    -e S3_REGION=<..> \
    -e S3_BUCKET=<..> \
    -e S3_ACCESS_KEY_ID=<..> \
    -e S3_SECRET_ACCESS_KEY=<..> \
    nginx-s3-simple-gateway
```

How to build:

```
docker image build -t nginx-s3-simple-gateway .
```
