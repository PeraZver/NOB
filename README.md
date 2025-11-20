# People's Liberation Struggle Map (NOB)

An interactive web application displaying historical military units, battles, and territories from the People's Liberation Struggle (1941-1945) on an interactive Leaflet map.

## Features

- **Interactive Map**: Browse military units, divisions, brigades, corps, and detachments on an interactive map
- **Occupied Territories**: View different occupation zones during WWII
- **Historical Map Overlays**: Extract and display borders from historical maps as vector overlays
- **Search Functionality**: Search for specific military units
- **Detailed Information**: Click on markers to view detailed information about each unit
- **Layer Management**: Toggle different layers on and off

## New: Historical Map Border Extraction

This application now includes powerful tools to extract borders from historical map images and display them as vector overlays on the modern map.

### Key Features
- 🗺️ **Extract borders** from scanned historical maps
- 🎯 **Georeference** extracted borders using Ground Control Points (GCPs)
- 📐 **Vector output** (GeoJSON) works at all zoom levels
- 🔧 **Adjustable parameters** for different map types
- 📊 **Debug visualization** to verify extraction results

### Quick Start

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Extract borders from a historical map:**
   ```bash
   python scripts/extractMapBorders.py \
     path/to/historical-map.jpg \
     public/assets/my-borders.json \
     --gcps path/to/ground-control-points.json \
     --debug-image /tmp/debug.jpg
   ```

3. **View on the map:**
   - Open the application
   - Click "Historical Maps" in the menu
   - The extracted borders will be displayed as vector overlays

For detailed instructions, see [Historical Maps Guide](docs/HISTORICAL_MAPS_GUIDE.md).

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- Python 3.7+ (for historical map extraction)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PeraZver/NOB.git
   cd NOB
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Install Python dependencies (optional, for map extraction):**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure database:**
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=nob
   PORT=3000
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open in browser:**
   Navigate to `http://localhost:3000`

## Project Structure

```
NOB/
├── public/              # Frontend files
│   ├── assets/          # Data files (JSON, markdown, icons)
│   │   ├── historical-borders.json    # Historical map borders
│   │   ├── historical-map-gcps.json   # Ground control points
│   │   └── historical-maps.md         # Historical maps info
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript modules
│   │   ├── map.js       # Main map initialization
│   │   ├── map_layers.js # Layer management
│   │   ├── layerState.js # State management
│   │   └── ...
│   └── index.html       # Main HTML file
├── scripts/             # Utility scripts
│   └── extractMapBorders.py  # Border extraction tool
├── src/                 # Backend source code
│   ├── app.js           # Express server
│   └── routes/          # API routes
├── docs/                # Documentation
│   └── HISTORICAL_MAPS_GUIDE.md  # Detailed guide for map extraction
├── requirements.txt     # Python dependencies
└── package.json         # Node.js dependencies
```

## Usage

### Viewing Layers

Click on the menu items to toggle different layers:
- **Occupied Territory**: View different occupation zones
- **Detachments**: View partisan detachment locations
- **Brigades**: View partisan brigade locations
- **Divisions**: View division locations
- **Corps**: View corps locations
- **Battles**: View battle locations (coming soon)
- **Historical Maps**: View extracted historical borders

### Working with Historical Maps

See the [Historical Maps Guide](docs/HISTORICAL_MAPS_GUIDE.md) for:
- How to extract borders from historical map images
- Setting up ground control points for georeferencing
- Fine-tuning extraction parameters
- Troubleshooting common issues

## API Endpoints

- `GET /api/brigades` - Get all brigades
- `GET /api/brigades/:id` - Get specific brigade
- `GET /api/detachments` - Get all detachments
- `GET /api/divisions` - Get all divisions
- `GET /api/corps` - Get all corps
- `GET /api/search` - Search military units

## Technologies Used

### Frontend
- **Leaflet.js**: Interactive maps
- **Marked.js**: Markdown rendering
- **Vanilla JavaScript**: ES6 modules

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MySQL**: Database

### Historical Map Processing
- **Python 3**: Scripting language
- **OpenCV**: Image processing and edge detection
- **NumPy**: Numerical computations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Areas for Contribution
- Add more historical maps
- Improve border extraction algorithms
- Add battle data
- Enhance UI/UX
- Add unit tests
- Improve documentation

## License

ISC

## Author

PeraZver

## Acknowledgments

- OpenStreetMap for base map tiles
- Historical sources for military unit data
- OpenCV community for image processing tools
