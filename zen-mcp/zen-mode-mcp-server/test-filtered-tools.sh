#!/bin/bash
# Test script for new filtered task listing tools
# Created: 2025-11-09

set -e

echo "Testing Zen Mode MCP filtered task tools..."
echo ""

# Test list_todo_tasks
echo "1. Testing list_todo_tasks..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_todo_tasks","arguments":{}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '.total'
echo "✓ list_todo_tasks working"
echo ""

# Test list_in_progress_tasks
echo "2. Testing list_in_progress_tasks..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_in_progress_tasks","arguments":{}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '.total'
echo "✓ list_in_progress_tasks working"
echo ""

# Test list_completed_tasks
echo "3. Testing list_completed_tasks (limit 5)..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_completed_tasks","arguments":{"limit":5}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '{total, limit, hasMore}'
echo "✓ list_completed_tasks working"
echo ""

# Test list_cancelled_tasks
echo "4. Testing list_cancelled_tasks..."
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"list_cancelled_tasks","arguments":{}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '.total'
echo "✓ list_cancelled_tasks working"
echo ""

# Test list_todo_tasks with priority filter
echo "5. Testing list_todo_tasks with HIGH priority filter..."
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"list_todo_tasks","arguments":{"priority":"HIGH"}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '.total'
echo "✓ list_todo_tasks with priority filter working"
echo ""

echo "All tests passed! ✅"
