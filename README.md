# People's Liberation Struggle Map (NOB)

An interactive web application displaying historical military units, battles, and territories from the People's Liberation Struggle (1941-1945) on an interactive Leaflet map.

## Features

- Interactive Map: Browse military units, divisions, brigades, corps, and detachments on an interactive map
- Occupied Territories: View different occupation zones during WWII
- Search Functionality: Search for specific military units
- Detailed Information: Click on markers to view detailed information about each unit

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL database

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/PeraZver/NOB.git
   cd NOB
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

4. Configure database:
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=nob
   PORT=3000
   ```

5. Start the server:
   ```bash
   npm start
   ```

6. Open in browser:
   Navigate to `http://localhost:3000`

## Project Structure

```
NOB/
├── public/                  # Frontend files
│   ├── assets/              # Data files (JSON, markdown, icons)
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript modules
│   │   ├── config.js        # Frontend configuration and icon definitions
│   │   ├── layerState.js    # Application state management
│   │   ├── map.js           # Main map initialization and UI
│   │   ├── map_layers.js    # Layer management logic
│   │   ├── search.js        # Search functionality
│   │   ├── sidebar.js       # Sidebar content management
│   │   ├── handlers/        # Event handlers
│   │   │   └── filterHandlers.js
│   │   └── utils/           # Utility functions
│   │       ├── dateUtils.js
│   │       ├── filterUtils.js
│   │       ├── markerUtils.js
│   │       └── popupUtils.js
│   └── index.html           # Main HTML file
├── scripts/                 # Utility scripts for database management
├── src/                     # Backend source code
│   ├── app.js               # Express server entry point
│   ├── config/              # Configuration
│   │   └── config.js        # Centralized configuration
│   ├── controllers/         # Business logic
│   │   └── militaryUnitsController.js
│   ├── db/                  # Database files
│   │   ├── pool.js          # Database connection pool
│   │   └── *.sql            # SQL scripts
│   ├── routes/              # API routes
│   │   ├── militaryUnitsRoutes.js
│   │   └── searchRoutes.js
│   └── utils/               # Utility functions
│       └── markdownLoader.js
├── docs/                    # Documentation
│   └── CODE_ORGANIZATION.md # Code structure documentation
├── package.json             # Node.js dependencies
└── README.md                # This file
```

For detailed information about the code organization and architecture, see [docs/CODE_ORGANIZATION.md](docs/CODE_ORGANIZATION.md).

## Usage

### Viewing Layers

Click on the menu items to toggle different layers:
- Occupied Territory: View different occupation zones
- Detachments: View partisan detachment formation locations
- Brigades: View partisan brigade formation locations
- Divisions: View division formation locations
- Corps: View corps formation locations
- Battles: View battle locations (coming soon)


## API Endpoints

- `GET /api/brigades` - Get all brigades
- `GET /api/brigades/:id` - Get specific brigade
- `GET /api/detachments` - Get all detachments
- `GET /api/divisions` - Get all divisions
- `GET /api/corps` - Get all corps
- `GET /api/search` - Search military units

## Technologies Used

### Frontend
- Leaflet.js: Interactive maps
- Marked.js: Markdown rendering
- Vanilla JavaScript: ES6 modules

### Backend
- Node.js: Runtime environment
- Express.js: Web framework
- MySQL: Database

### Historical Map Processing
- Python 3: Scripting language
- OpenCV: Image processing and edge detection
- NumPy: Numerical computations