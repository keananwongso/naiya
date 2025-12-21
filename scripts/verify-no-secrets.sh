#!/bin/bash
# verify-no-secrets.sh
# Scans tracked files for potential secrets and credentials
# Run before committing or pushing to ensure no sensitive data is exposed

set -e

echo "🔍 Scanning for secrets in tracked git files..."
echo ""

FOUND=0

# Function to search and report
check_pattern() {
    local pattern="$1"
    local description="$2"
    local exclude="$3"

    echo "Checking for: $description"

    if [ -n "$exclude" ]; then
        # Search excluding certain file types
        if git ls-files | xargs grep -l -E "$pattern" -- \
            ':!*.json' ':!*package-lock.json' ':!*.lock' 2>/dev/null; then
            echo "  ❌ FOUND: $description"
            FOUND=$((FOUND + 1))
        else
            echo "  ✅ Clean"
        fi
    else
        # Search all tracked files
        if git ls-files | xargs grep -l -E "$pattern" 2>/dev/null; then
            echo "  ❌ FOUND: $description"
            FOUND=$((FOUND + 1))
        else
            echo "  ✅ Clean"
        fi
    fi
    echo ""
}

# OpenAI API Keys (sk- prefix)
check_pattern "sk-[a-zA-Z0-9]{20,}" "OpenAI API Keys" "exclude-json"

# Supabase Service Role Keys (very long JWTs, >200 chars)
check_pattern "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{200,}" "Supabase Service Role Keys" "exclude-json"

# Google OAuth Client Secrets
check_pattern "GOCSPX-[a-zA-Z0-9_-]{20,}" "Google OAuth Client Secrets" "exclude-json"

# Private Keys (PEM format)
check_pattern "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----" "Private Keys (PEM)" "exclude-json"

# AWS Keys
check_pattern "AKIA[0-9A-Z]{16}" "AWS Access Key IDs" "exclude-json"

# Generic API key patterns (api_key=, apiKey:, etc.)
check_pattern "(api[_-]?key|apikey|api[_-]?secret)[\s]*[:=][\s]*['\"][a-zA-Z0-9_-]{20,}['\"]" "Generic API Keys" "exclude-json"

# Supabase URLs with embedded tokens
check_pattern "supabase\.co.*[\?&]token=" "Supabase URLs with tokens" "exclude-json"

# Check for actual .env files (should not be tracked)
echo "Checking for tracked .env files..."
if git ls-files | grep -E "\.env$|\.env\.local$" | grep -v "\.env\.example$" 2>/dev/null; then
    echo "  ❌ FOUND: Tracked .env files (should be gitignored)"
    FOUND=$((FOUND + 1))
else
    echo "  ✅ Clean - no .env files tracked"
fi
echo ""

# Final report
echo "═══════════════════════════════════════"
if [ $FOUND -eq 0 ]; then
    echo "✅ VERIFICATION PASSED"
    echo "No secrets detected in tracked files."
    exit 0
else
    echo "❌ VERIFICATION FAILED"
    echo "Found $FOUND potential secret(s) in tracked files."
    echo ""
    echo "Action required:"
    echo "1. Review the files listed above"
    echo "2. Remove secrets and use environment variables"
    echo "3. If secrets were previously committed, consider:"
    echo "   - git filter-repo to purge from history"
    echo "   - Rotating the exposed credentials"
    exit 1
fi
