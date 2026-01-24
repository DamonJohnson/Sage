#!/bin/bash

# PDF Upload Test Runner
# Usage: ./scripts/test-pdf-upload.sh [backend|frontend|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

run_backend_tests() {
    echo "🔧 Running Backend PDF Upload Tests..."
    echo ""
    npx tsx backend/src/tests/pdf-upload.test.ts
}

run_frontend_tests() {
    echo "🎨 Running Frontend PDF Upload Tests..."
    echo ""
    echo "Note: Frontend tests require a browser environment for full coverage."
    echo "Running what's possible in Node.js..."
    echo ""
    npx tsx app/src/tests/pdf-upload.test.ts
}

check_server() {
    echo "Checking if backend server is running..."
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend server is running"
        return 0
    else
        echo "⚠️  Backend server is not running"
        echo "   Start it with: npm run dev"
        return 1
    fi
}

case "${1:-all}" in
    backend)
        check_server && run_backend_tests
        ;;
    frontend)
        run_frontend_tests
        ;;
    all)
        check_server && run_backend_tests
        echo ""
        echo "---"
        echo ""
        run_frontend_tests
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac
