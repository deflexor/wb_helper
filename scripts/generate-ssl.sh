#!/bin/bash
# =============================================================================
# SSL Certificate Generation Script
# =============================================================================
# Generates a self-signed SSL certificate for local development.
# For production, use Let's Encrypt or a commercial CA.
#
# Usage: ./scripts/generate-ssl.sh [output-dir]
# Default output directory: /etc/nginx/ssl
# =============================================================================

set -euo pipefail

# Configuration
COUNTRY="${COUNTRY:-RU}"
STATE="${STATE:-Moscow}"
CITY="${CITY:-Moscow}"
ORG="${ORG:-WBHelper}"
OU="${OU:-Development}"
CN="${CN:-localhost}"
DAYS="${DAYS:-365}"
EMAIL="${EMAIL:-dev@wbhelper.local}"

# Default output directory
OUTPUT_DIR="${1:-/etc/nginx/ssl}"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Certificate files
CERT_FILE="$OUTPUT_DIR/fullchain.pem"
KEY_FILE="$OUTPUT_DIR/privkey.pem"
CSR_FILE="$OUTPUT_DIR/csr.pem"

echo "Generating self-signed SSL certificate..."
echo "Output directory: $OUTPUT_DIR"
echo "Common Name: $CN"
echo "Valid for: $DAYS days"

# Generate private key and certificate in one command
openssl req -x509 -nodes -days "$DAYS" \
    -newkey rsa:4096 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$CN/emailAddress=$EMAIL" \
    -addext "subjectAltName=DNS:localhost,DNS:wbhelper,IP:127.0.0.1,IP:::1" \
    -addext "basicConstraints=CA:FALSE" \
    -addext "keyUsage=digitalSignature,keyEncipherment" \
    -addext "extendedKeyUsage=serverAuth,clientAuth"

# Set proper permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo ""
echo "✅ SSL certificate generated successfully!"
echo "   Certificate: $CERT_FILE"
echo "   Private Key: $KEY_FILE"
echo ""
echo "⚠️  NOTE: This is a self-signed certificate for local development only."
echo "   For production, use Let's Encrypt or a commercial CA."
echo ""
echo "To view certificate details:"
echo "   openssl x509 -in $CERT_FILE -text -noout"
