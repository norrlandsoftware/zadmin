# Tech Stack

## Core Technologies

- React 18.2 with TypeScript
- React Router v6 for routing
- Material-UI (MUI) v5 for UI components
- Emotion for styling
- Create React App (react-scripts) for build tooling

## Key Libraries

- @tanstack/react-query v4 - Server state management and data fetching
- axios - HTTP client for API communication
- react-hook-form v7 - Form handling and validation

## Development Setup

The project uses Create React App with TypeScript configuration.

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Environment Configuration

- `REACT_APP_API_URL` - Backend API URL (defaults to http://127.0.0.1:8000)

## API Integration

- Axios instance configured in `src/services/api.ts`
- Bearer token authentication via localStorage
- Request interceptor adds auth token to all requests
- API organized by resource (pops, olts, onts, users, auth)
