#!/bin/bash

################################################################################
# Domain Migration Verification Script
# Tests both new and legacy domains to ensure backward compatibility
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}ZenFlo Domain Migration Verification${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test health endpoints
echo -e "${BLUE}Testing Health Endpoints...${NC}"
echo ""

# New domain
echo -e "${YELLOW}Testing NEW domain (happy.zenflo.dev):${NC}"
if curl -sf https://happy.zenflo.dev/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} https://happy.zenflo.dev/health"
else
    echo -e "  ${RED}✗${NC} https://happy.zenflo.dev/health ${RED}FAILED${NC}"
fi

if curl -sf https://happy.zenflo.dev/v1/auth/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} https://happy.zenflo.dev/v1/auth/health"
else
    echo -e "  ${RED}✗${NC} https://happy.zenflo.dev/v1/auth/health ${RED}FAILED${NC}"
fi

echo ""

# Legacy domain
echo -e "${YELLOW}Testing LEGACY domain (happy.combinedmemory.com):${NC}"
if curl -sf https://happy.combinedmemory.com/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} https://happy.combinedmemory.com/health"
else
    echo -e "  ${RED}✗${NC} https://happy.combinedmemory.com/health ${RED}FAILED${NC}"
fi

if curl -sf https://happy.combinedmemory.com/v1/auth/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} https://happy.combinedmemory.com/v1/auth/health"
else
    echo -e "  ${RED}✗${NC} https://happy.combinedmemory.com/v1/auth/health ${RED}FAILED${NC}"
fi

echo ""
echo -e "${BLUE}Testing CORS Configuration...${NC}"
echo ""

# Test CORS preflight for new domain
echo -e "${YELLOW}Testing NEW webapp origin (app.zenflo.dev):${NC}"
CORS_RESPONSE=$(curl -sI -H "Origin: https://app.zenflo.dev" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS \
    https://happy.zenflo.dev/v1/auth/request)

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo -e "  ${GREEN}✓${NC} CORS headers present"
else
    echo -e "  ${RED}✗${NC} CORS headers missing ${RED}FAILED${NC}"
fi

echo ""

# Test CORS preflight for legacy domain
echo -e "${YELLOW}Testing LEGACY webapp origin (app.combinedmemory.com):${NC}"
CORS_RESPONSE=$(curl -sI -H "Origin: https://app.combinedmemory.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS \
    https://happy.zenflo.dev/v1/auth/request)

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo -e "  ${GREEN}✓${NC} CORS headers present"
else
    echo -e "  ${RED}✗${NC} CORS headers missing ${RED}FAILED${NC}"
fi

echo ""
echo -e "${BLUE}Configuration Checks...${NC}"
echo ""

# Check if running on NAS
echo -e "${YELLOW}Checking NAS deployment:${NC}"
if ssh nas@nas-1 "sudo docker ps | grep zenflo-server" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Container is running on NAS"

    # Check container status
    STATUS=$(ssh nas@nas-1 "sudo docker ps --filter name=zenflo-server --format '{{.Status}}'")
    echo -e "  ${GREEN}✓${NC} Container status: ${CYAN}$STATUS${NC}"
else
    echo -e "  ${YELLOW}⚠${NC} Cannot verify NAS deployment (SSH not configured or container not running)"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Verification complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update GitHub OAuth app callback URL to: https://happy.zenflo.dev/v1/connect/github/callback"
echo "  2. Update GITHUB_REDIRECT_URL in .env.production on NAS"
echo "  3. Test OAuth flow from new webapp (https://app.zenflo.dev)"
echo "  4. Monitor logs for any CORS errors"
echo ""
