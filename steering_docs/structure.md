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
- Route structure includes `/login`, `/`, `/pops/*`, `/olts/*`, `/onts/*`, `/users/*`, `/settings/*`, `/config-templates/*`, and `/device-models/:modelType`
- OLT sub-routes host settings, rendered configurations, rendered configuration details, and workflow instance views

### State Management
- React Context for authentication state (`AuthContext`)
- TanStack Query (React Query) for server state
- Local component state with useState/useReducer
- Use local state for UI-only concerns such as open dialogs, notes, visibility toggles, and filters

### Authentication
- Token-based auth with Bearer tokens
- Tokens stored in localStorage
- AuthContext provides `isAuthenticated`, `login`, `logout`, `loading`
- Axios interceptor automatically adds auth header to requests

### API Layer
- Centralized API client in `src/services/api.ts`
- Resource-based API modules (pops, olts, onts, users, auth, workflows, etc.)
- CRUD-style resources usually export `getAll`, `getById`, `create`, `update`
- Non-CRUD resources should expose intent-based methods, for example workflow start/stop/manual-action/retry calls
- Axios instance with base URL and interceptors

### Component Patterns
- Functional components with TypeScript
- Props interfaces defined inline or separately
- Reusable components in `components/` directory
- Page components in `pages/` directory
- Common components: DataTable, DetailDialog, Layout
- Workflow components must be backend-driven: render task state, current task, attempts, progress, errors, and action metadata from API responses
- Do not hardcode workflow step order or client-side workflow rules in the UI; backend validation is the source of truth
- Only the backend-declared current task should show executable controls; completed and future tasks may be visible but not executable
- Keep reusable components logic-light; pages own API calls and pass callbacks/data into components

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
          └── ResultBarProvider
              └── AuthProvider
                  └── Router
```
