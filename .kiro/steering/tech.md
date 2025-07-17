# Technology Stack

## Core Framework
- **Next.js 15.4.1** - React framework with App Router
- **React 19.1.0** - Latest React with concurrent features
- **TypeScript 5** - Static typing throughout the codebase

## Styling & UI
- **Tailwind CSS v4** - Utility-first CSS framework
- **PostCSS** - CSS processing with Tailwind plugin
- **Geist Fonts** - Optimized font loading (Sans & Mono variants)

## Development Tools
- **ESLint 9** - Code linting with Next.js and TypeScript rules
- **Turbopack** - Fast bundler for development
- **Bun** - Package manager and runtime (bun.lock present)

## Build System & Commands

### Development
```bash
bun dev          # Start development server with Turbopack
```

### Production
```bash
bun build        # Create production build
bun start        # Start production server
```

### Code Quality
```bash
bun lint         # Run ESLint checks
```

## Configuration Notes
- Path aliases: `@/*` maps to `./src/*`
- Strict TypeScript configuration enabled
- ES2017 target with modern module resolution
- ESLint extends Next.js core web vitals and TypeScript rules