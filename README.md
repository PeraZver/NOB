# People's Liberation Struggle Map (NOB)

An interactive web application displaying historical military units, battles, and territories from the People's Liberation Struggle (1941-1945) on an interactive Leaflet map.

## Features

- Interactive Map: Browse military units, divisions, brigades, corps, and detachments on an interactive map
- Occupied Territories: View different occupation zones during WWII
- Campaign Movements: Click on brigade markers to view their campaign movements and operations
- Search Functionality: Search for specific military units
- Filter by timestamp: search based on the time specified filter
- Detailed Information: Click on markers to view detailed information about each unit
- Using GPT to fetch and organize historical records into campaign data

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

5. Start the MySQL80 network service

6. Start the server:
   ```bash
   npm start
   ```

7. Open in browser:
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
│   │       ├── geometryUtils.js
│   │       ├── markerUtils.js
│   │       └── popupUtils.js
│   └── index.html           # Main HTML file
├── scripts/                 # Utility scripts for database management
├── src/                     # Backend source code
│   ├── app.js               # Express server entry point
│   ├── config/              # Configuration
│   │   └── config.js        # Centralized configuration
│   ├── controllers/         # Business logic
│   │   ├── battlesController.js
│   │   ├── campaignsController.js
│   │   └── militaryUnitsController.js
│   ├── db/                  # Database files
│   │   ├── pool.js          # Database connection pool
│   │   └── *.sql            # SQL scripts
│   ├── routes/              # API routes
│   │   ├── battlesRoutes.js
│   │   ├── campaignsRoutes.js
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
  - Click on a brigade marker to see the "Campaign" button
  - Click "Campaign" to view that brigade's campaign movements
- Divisions: View division formation locations
- Corps: View corps formation locations
- Battles: View battle locations

Click on the Calendar to see the events that happened by the given time.
For exmaple, selecting "June 1943" will display only the military units formed before the June 1943, and in the case of the campaigns, it will display only the movement up untill that point in time. 


## Generating Brigade and Division Markdown Files

For each brigade or divison in the database, a Markdown file can be generated using the OpenAI's GPT agent. The content is for now based off of the Wikipedia entry of the provided briagade. For this to work, the OpenAI API credentials are needed.

Quick start:
```bash

# Generate markdown files (requires OPENAI_API_KEY in .env file)
node scripts/generateBrigadeMarkdown.js --id <brigade-id>
# in case of divisions, use 
 node scripts/generateDivisionMarkdown.js --id <division-id>

Options:
  --dry-run         Test the script without fetching content or creating files
  -a, --all         Process all brigades (default)
  -<number>         Process only the first N brigades (e.g., -3 for first 3)
  --id <number>     Process a single brigade by database ID
  --force           Force recreation of existing markdown files (with --id)
  --help, -h        Show this help message

```

To generate formatted markdown files for brigades from Wikipedia content, see the comprehensive guide: [docs/BRIGADE_MARKDOWN_GENERATION.md](docs/BRIGADE_MARKDOWN_GENERATION.md)


## Generating the campaign data using OpenAI 
First, we generate the JSON file for each brigade where each item contains the time and place in the brigade's campaign. For now, I'm using the records available on znaci.org, and manually editing whatever GPT spits out. I add new entries from different sources when I research the given brigade.
For this to work, the OpenAI API credentials are needed.

```bash
node .\scripts\generateBrigadeCampaignJSON.js -w http://your-source-website.com
```

Then, campaign data is imported form the JSON file into the database, using the 

```bash
 node .\scripts\importCampaigns.j -f /path/to/campaign.json
```

For campaign testing purposes, the campaign trails can be immediely displayed using
http://localhost:3000/?testBrigade<brigade_id> in the browser

## API Endpoints

- `GET /api/brigades` - Get all brigades
- `GET /api/brigades/:id` - Get specific brigade
- `GET /api/detachments` - Get all detachments
- `GET /api/divisions` - Get all divisions
- `GET /api/corps` - Get all corps
- `GET /api/campaigns/brigade/:brigadeId` - Get campaign movements for a specific brigade
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

# Historical references
- [znaci.org](znaci.org)
- [Deseti-korpus.com(archive)](https://web.archive.org/web/20160303162517/http://www.deseti-korpus.com/index.php?option=com_content&view=article&id=47&Itemid=28)
- [Antifasisticki Split - Ratna kronika](https://web.archive.org/web/20181201100801/http://www.ratnakronikasplita.com/impresum/uvod)
- [NOB Wikipedia Portal](https://sr.wikipedia.org/sr-el/%D0%9F%D0%BE%D1%80%D1%82%D0%B0%D0%BB:%D0%9D%D0%B0%D1%80%D0%BE%D0%B4%D0%BD%D0%BE%D0%BE%D1%81%D0%BB%D0%BE%D0%B1%D0%BE%D0%B4%D0%B8%D0%BB%D0%B0%D1%87%D0%BA%D0%B0_%D0%B1%D0%BE%D1%80%D0%B1%D0%B0)
- [Wiki - Partizanski odredi Hrvatske](https://sr.wikipedia.org/sr-el/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%98%D0%B0:%D0%9F%D0%B0%D1%80%D1%82%D0%B8%D0%B7%D0%B0%D0%BD%D1%81%D0%BA%D0%B8_%D0%BE%D0%B4%D1%80%D0%B5%D0%B4%D0%B8_%D0%B8%D0%B7_%D0%A5%D1%80%D0%B2%D0%B0%D1%82%D1%81%D0%BA%D0%B5)
