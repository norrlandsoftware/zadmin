# Product Overview

ZAPI Frontend is a React-based web interface for managing network infrastructure resources. It provides authenticated access to manage:

- POPs (Points of Presence)
- OLTs (Optical Line Terminals)
- ONTs (Optical Network Terminals)
- BNGs and switches
- Device models
- Users and authentication
- Configuration templates
- Rendered OLT initialization configurations
- Operational workflows such as OLT initialization

The application connects to a backend API and provides network resource management with a clean, Material-UI based interface. Most resource pages are CRUD-oriented, while workflow screens are backend-driven operator views: the backend decides task sequence, current task, status, available actions, and task metadata; the frontend renders that state and sends explicit operator actions.
