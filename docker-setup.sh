#!/bin/bash

# Docker Setup Script for SvelteBase
# This script helps you set up the Docker environment

set -e

echo "========================================="
echo "  SvelteBase Docker Setup"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your configuration:"
    echo "   - DOMAIN: Your domain name"
    echo "   - CF_API_EMAIL: Your Cloudflare email"
    echo "   - CF_DNS_API_TOKEN: Your Cloudflare API token"
    echo "   - TRAEFIK_DASHBOARD_USERS: Dashboard credentials"
    echo ""
    echo "To generate dashboard password, run:"
    echo "  echo \$(htpasswd -nb admin your-password) | sed -e s/\\\\\$/\\\\\$\\\\\$/g"
    echo ""
    read -p "Press Enter after you've configured .env file..."
else
    echo "✅ .env file already exists"
fi

echo ""

# Check if Docker network exists
if ! docker network ls | grep -q "web"; then
    echo "🌐 Creating Docker network 'web'..."
    docker network create web
    echo "✅ Docker network created"
else
    echo "✅ Docker network 'web' already exists"
fi

echo ""

# Check acme.json permissions
if [ -f traefik/acme.json ]; then
    PERMS=$(stat -c %a traefik/acme.json)
    if [ "$PERMS" != "600" ]; then
        echo "🔒 Fixing acme.json permissions..."
        chmod 600 traefik/acme.json
        echo "✅ Permissions fixed"
    else
        echo "✅ acme.json permissions are correct"
    fi
fi

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Review your .env configuration"
echo "  2. Start services: docker compose up -d"
echo "  3. View logs: docker compose logs -f"
echo "  4. Check status: docker compose ps"
echo ""
echo "Or use npm scripts:"
echo "  npm run docker:up      # Start services"
echo "  npm run docker:logs    # View logs"
echo "  npm run docker:down    # Stop services"
echo ""
echo "Your app will be available at: https://\${DOMAIN}"
echo "Traefik dashboard: https://traefik.\${DOMAIN}"
echo ""
