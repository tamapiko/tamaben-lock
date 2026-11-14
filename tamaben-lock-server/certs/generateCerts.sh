#!/bin/bash
set -e

DIR="/Users/uedamasahiro/.gemini/antigravity/scratch/TAMABEN_LOCK/server/certs"
cd "$DIR"

# 1. CA Root Key & Certificate
/opt/homebrew/bin/openssl req -new -x509 -nodes -days 3650 \
  -keyout ca.key -out ca.crt \
  -subj "/C=JP/O=TAMABEN LOCK/CN=TAMABEN LOCK Root CA"

# 2. Device Identity Key & CSR
/opt/homebrew/bin/openssl req -new -nodes \
  -keyout device.key -out device.csr \
  -subj "/C=JP/O=TAMABEN LOCK/CN=TAMABEN LOCK Device Identity"

# 3. Sign Device Certificate with CA
/opt/homebrew/bin/openssl x509 -req -days 1825 \
  -in device.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out device.crt

# 4. Export PKCS#12 (.p12) with password 'tamaben'
/opt/homebrew/bin/openssl pkcs12 -export \
  -inkey device.key -in device.crt -certfile ca.crt \
  -out device.p12 -passout pass:tamaben

echo "Certificates generated successfully."
