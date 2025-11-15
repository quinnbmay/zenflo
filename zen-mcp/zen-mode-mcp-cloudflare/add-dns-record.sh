#!/bin/bash

# Add DNS record for zen.zenflo.dev
# This script uses your Cloudflare credentials to add a CNAME record

echo "Adding DNS record: zen.zenflo.dev -> zen-mode-mcp.quinn-4b3.workers.dev"

ZONE_ID="d19ff1e79dd2b5d7f5137779ad47a5e6"

# Check if you have CF_API_TOKEN set
if [ -z "$CF_API_TOKEN" ]; then
  echo ""
  echo "Please set CF_API_TOKEN environment variable."
  echo ""
  echo "Get your API token from:"
  echo "https://dash.cloudflare.com/profile/api-tokens"
  echo ""
  echo "Required permissions:"
  echo "  - Zone:DNS:Edit for zenflo.dev"
  echo ""
  echo "Then run:"
  echo "  export CF_API_TOKEN='your-token-here'"
  echo "  ./add-dns-record.sh"
  echo ""
  echo "OR just add it manually at:"
  echo "https://dash.cloudflare.com/4b339d9b82347caea48bbe42d4896bbd/zenflo.dev/dns/records"
  echo ""
  echo "Click 'Add record' and fill in:"
  echo "  Type: CNAME"
  echo "  Name: zen"
  echo "  Target: zen-mode-mcp.quinn-4b3.workers.dev"
  echo "  Proxied: Yes (orange cloud)"
  exit 1
fi

# Add CNAME record
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "zen",
    "content": "zen-mode-mcp.quinn-4b3.workers.dev",
    "ttl": 1,
    "proxied": true
  }' | jq '.'

echo ""
echo "If successful, test with:"
echo "  curl https://zen.zenflo.dev/health"
