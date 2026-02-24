#!/bin/bash

echo "🏛️  Setting up Colosseum Web UI..."
echo ""

cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server, run:"
echo "   npm run dev"
echo ""
echo "📝 Make sure Senatus is running on http://localhost:1337"
echo ""
