#!/bin/sh
# MinIO bucket initialization script for Didactic AI
set -e

echo "Waiting for MinIO server to become available..."
until (/usr/bin/mc alias set local http://minio:9000 minioadmin minioadmin); do
  echo "MinIO server not ready yet. Retrying in 2 seconds..."
  sleep 2
done

echo "MinIO connected. Creating default buckets..."
/usr/bin/mc mb --ignore-existing local/lecture-uploads
/usr/bin/mc mb --ignore-existing local/rubric-exports
/usr/bin/mc mb --ignore-existing local/submissions

echo "Configuring public download policies for lecture-uploads..."
/usr/bin/mc anonymous set download local/lecture-uploads

echo "MinIO storage initialization completed successfully."
exit 0
