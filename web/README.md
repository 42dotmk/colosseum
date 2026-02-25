# Colosseum Web UI

Modern, dark-themed competitive programming platform built with React, Vite, shadcn/ui, and Monaco Editor.

## ✨ Features

- 🔐 **Authentication** - JWT-based login/register with Strapi
- 🎨 **Modern Dark UI** - Beautiful dark theme with purple/pink gradients
- 💻 **Monaco Editor** - Professional code editor with syntax highlighting
- 🏆 **Event-based Competitions** - Browse and participate in coding events
- ⚡ **REST API** - Fast communication with Strapi backend
- 📱 **Responsive Design** - Works on all screen sizes
- 🌊 **Animated Backgrounds** - Smooth gradient animations

## 🚀 Quick Start

```bash
# Run the setup script
./setup.sh

# Or manually:
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## 📋 Prerequisites

- Node.js 18+ 
- Strapi backend running on `http://localhost:1337`

## 🛠️ Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🎨 Tech Stack

- **React 18** - UI framework
- **Vite** - Lightning-fast build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Monaco Editor** - VS Code's editor
- **React Router** - Client-side routing
- **REST API** - Direct communication with Strapi

## Project Structure

```
web/
├── src/
│   ├── components/     # Reusable components
│   │   └── ui/        # shadcn/ui components
│   ├── contexts/      # React contexts (Auth)
│   ├── pages/         # Page components
│   ├── lib/           # Utilities
│   ├── App.tsx        # Main app component
│   └── main.tsx       # Entry point
├── public/            # Static assets
└── package.json       # Dependencies
```
