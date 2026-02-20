#!/bin/sh

# Create runtime config file with environment variables
cat > /usr/share/nginx/html/config.js <<EOF
window.ENV = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-http://127.0.0.1:8000}"
};
EOF

echo "Runtime configuration created:"
cat /usr/share/nginx/html/config.js

# Execute the CMD
exec "$@"
