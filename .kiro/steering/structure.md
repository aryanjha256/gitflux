# Project Structure

## Root Directory
```
├── .git/                 # Git repository
├── .kiro/               # Kiro AI assistant configuration
├── node_modules/        # Dependencies
├── public/              # Static assets
├── src/                 # Source code
├── package.json         # Project dependencies and scripts
├── next.config.ts       # Next.js configuration
├── tsconfig.json        # TypeScript configuration
├── eslint.config.mjs    # ESLint configuration
├── postcss.config.mjs   # PostCSS configuration
└── README.md            # Project documentation
```

## Source Structure (`src/`)
- **App Router Architecture** - Uses Next.js 13+ app directory structure
- **`src/app/`** - Main application directory containing:
  - `layout.tsx` - Root layout component with font configuration
  - `page.tsx` - Home page component
  - `globals.css` - Global styles and Tailwind imports
  - `favicon.ico` - Application favicon

## Static Assets (`public/`)
- SVG icons and graphics
- Publicly accessible files served from root

## Conventions
- **File Naming**: Use kebab-case for files, PascalCase for React components
- **Import Paths**: Use `@/` alias for src directory imports
- **Component Structure**: Follow Next.js App Router conventions
- **Styling**: Tailwind utility classes with CSS custom properties for fonts
- **TypeScript**: Strict mode enabled, all files should be typed

## Key Files
- **`layout.tsx`** - Defines app-wide layout, fonts, and metadata
- **`page.tsx`** - Route-level page components
- **`globals.css`** - Global styles and Tailwind directives