# Project Structure

## Directory Organization

```
src/
├── components/      # Reusable UI components
├── contexts/        # React Context providers (auth, etc.)
├── pages/          # Page components mapped to routes
├── services/       # API client and external service integrations
├── App.tsx         # Root component with routing and providers
├── index.tsx       # Application entry point
└── theme.ts        # MUI theme configuration
```

## Architecture Patterns

### Routing
- React Router v6 with nested routes
- PrivateRoute wrapper component for authenticated routes
- Route structure: `/login`, `/`, `/pops/*`, `/olts/*`, `/onts/*`, `/users/*`

### State Management
- React Context for authentication state (`AuthContext`)
- TanStack Query (React Query) for server state
- Local component state with useState/useReducer

### Authentication
- Token-based auth with Bearer tokens
- Tokens stored in localStorage
- AuthContext provides `isAuthenticated`, `login`, `logout`, `loading`
- Axios interceptor automatically adds auth header to requests

### API Layer
- Centralized API client in `src/services/api.ts`
- Resource-based API modules (pops, olts, onts, users, auth)
- Each resource exports: `getAll`, `getById`, `create`, `update`
- Axios instance with base URL and interceptors

### Component Patterns
- Functional components with TypeScript
- Props interfaces defined inline or separately
- Reusable components in `components/` directory
- Page components in `pages/` directory
- Common components: DataTable, DetailDialog, Layout

### File Naming
- `.tsx` extension for React components
- `.ts` extension for non-component TypeScript files
- PascalCase for component files (e.g., `DataTable.tsx`)
- camelCase for utility/service files (e.g., `api.ts`, `theme.ts`)

### Provider Hierarchy
```
ThemeProvider (MUI)
  └── CssBaseline
      └── QueryClientProvider (React Query)
          └── AuthProvider
              └── Router
```
