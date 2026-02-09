#!/bin/bash

# Database Cloud Migration Helper Script
# This script helps automate the migration process to Railway

set -e

echo "🚀 PC Points Database Cloud Migration Helper"
echo "============================================"
echo ""

# Check if backup.sql exists
if [ ! -f "backup.sql" ]; then
    echo "❌ Error: backup.sql not found in current directory"
    echo "   Please make sure you're in the project root directory"
    exit 1
fi

echo "✅ Found backup.sql file"
echo ""

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI is installed"
    RAILWAY_CLI_AVAILABLE=true
else
    echo "⚠️  Railway CLI not found"
    echo "   Install it with: npm install -g @railway/cli"
    RAILWAY_CLI_AVAILABLE=false
fi

echo ""
echo "📋 Migration Steps:"
echo "=================="
echo ""
echo "1. Upload backup.sql to GitHub Gist:"
echo "   - Go to: https://gist.github.com"
echo "   - Create a NEW SECRET gist"
echo "   - Name file: backup.sql"
echo "   - Paste contents of backup.sql"
echo "   - Click 'Create secret gist'"
echo "   - Click 'Raw' button"
echo "   - Copy the raw URL"
echo ""
echo "2. Deploy to Railway (if not already):"
echo "   - Go to: https://railway.app"
echo "   - Create New Project → Deploy from GitHub"
echo "   - Select your repository"
echo ""
echo "3. Set up persistent storage:"
echo "   - Railway Dashboard → Your Project → + New → Volume"
echo "   - Name: pcpoints-data"
echo "   - Mount Path: /data"
echo "   - Attach to your web service"
echo ""
echo "4. Set environment variables in Railway:"
echo "   - DATABASE_PATH=/data/pcpoints.sqlite"
echo "   - JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "   - NODE_ENV=production"
echo "   - RESTORE_SQL_URL=<your-gist-raw-url>"
echo ""
echo "5. Restore database:"
echo "   Deploy (restore runs on Railway at startup when RESTORE_SQL_URL is set)."
echo "   Check deploy logs for: Restore complete: N users, ..."
echo ""
echo "6. Remove RESTORE_SQL_URL variable after successful restore, then redeploy"
echo ""
echo "📖 For detailed instructions, see: MIGRATE_TO_CLOUD.md"
echo ""

# Generate JWT_SECRET if requested
read -p "Generate a JWT_SECRET now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Generated JWT_SECRET:"
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    echo ""
fi

echo ""
echo "✨ Ready to migrate! Follow the steps above or see MIGRATE_TO_CLOUD.md for details."
