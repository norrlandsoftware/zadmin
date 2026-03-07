# ZAPI Frontend

This is the React-based frontend for the ZAPI project. It provides a web interface to manage POPs, OLTs, ONTs and other network resources.

## Project Structure

```
frontend/
  ├── src/
  │   ├── components/     # Reusable UI components
  │   ├── pages/         # Page components for each route
  │   ├── services/      # API client and other services
  │   ├── hooks/         # Custom React hooks
  │   ├── utils/         # Utility functions
  │   └── types/         # TypeScript type definitions
  ├── public/           # Static assets
  └── package.json      # Project dependencies and scripts
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Features

- Authentication with API key
- Management of POPs (Points of Presence)
- Management of OLTs (Optical Line Terminals)
- Management of ONTs (Optical Network Terminals)
- User management
- Configuration templates
- API configuration

# Docker
## Build the Docker image
Step 1 - Create the Docker
`docker build --platform linux/amd64/v4 -t zadmin:<VERSION> .`

Step 2 - Tag docker image (i.e. under the lboff account)
`docker tag zadmin:<VERSION> lboff/zadmin:<VERSION>`

Step 3 - Upload the docker image (i.e. under the lboff account)

If the user is not logged in.. log in
`docker login -u lboff`

`docker push lboff/zadmin:<VERSION>`

## Run the container
```bash
docker run -p 3000:80 -e REACT_APP_API_URL=http://your-api-url:8000 zadmin
```
