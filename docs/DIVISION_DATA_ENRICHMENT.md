# Division Data Enrichment Scripts

This directory contains scripts to enrich WW2 division data with formation site information and geocoordinates using Wikipedia and OpenAI API.

## Overview

The scripts work in two steps:
1. **Export divisions** from the database to a JSON file
2. **Update divisions** with formation site and geocoordinates by analyzing Wikipedia content

## Prerequisites

- Node.js (v14 or higher)
- MySQL database with divisions table
- OpenAI API key (get one at https://platform.openai.com/api-keys)
- Required npm packages (already in package.json):
  - `mysql2`
  - `axios`
  - `cheerio`
  - `openai`
  - `dotenv`

## Setup

1. Create a `.env` file in the project root with the following variables:
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=nob
OPENAI_API_KEY=your_openai_api_key
```

2. Ensure your database has a `divisions` table with at least these columns:
   - `id` (integer)
   - `name` (varchar)
   - `formation_date` (date)
   - `formation_site` (varchar, nullable)
   - `description` (text)
   - `wikipedia_url` (varchar)

**OR** if working with a standalone JSON file, ensure it has this structure:
```json
[
  {
    "name": "Division name",
    "formation_date": "YYYY-MM-DD",
    "composition": "Optional composition info",
    "wikipedia_url": "https://..."
  }
]
```

## Usage

### Step 1: Export Divisions from Database

Export all divisions with Wikipedia URLs to a JSON file:

```bash
node scripts/exportDivisions.js
```

This creates `divisions_data.json` in the project root containing all divisions from the database.

### Step 2: Enrich Division Data

Process the exported JSON file (or your own incomplete JSON file) to add formation sites and geocoordinates:

```bash
node scripts/updateDivisionSites.js divisions_data.json
```

Or if you have your own JSON file:

```bash
node scripts/updateDivisionSites.js path/to/your/divisions.json
```

This will:
1. Read each division from the JSON file
2. Fetch Wikipedia content from the division's URL
3. Use OpenAI to extract the formation site from the Wikipedia content
4. Use OpenAI to find approximate geocoordinates for the formation site
5. Create an updated JSON file: `divisions_data_updated.json`

### Options and Configuration

You can modify the behavior by editing the `CONFIG` object in `updateDivisionSites.js`:

```javascript
const CONFIG = {
    MAX_CONTENT_LENGTH: 50000,   // Max Wikipedia content to send to AI
    RETRY_DELAY_MS: 3000,         // Delay between retries
    RATE_LIMIT_DELAY_MS: 2000,    // Delay between divisions
    MAX_RETRIES: 2                // Maximum retry attempts
};
```

## Output Format

The updated JSON file will add `formation_site` and `formation_geo` fields to each division:

**Input (incomplete JSON):**
```json
{
  "name": "1. proleterska udarna divizija",
  "formation_date": "1942-11-01",
  "composition": "1. proleterska, 3. proleterska i 3. krajiška brigada",
  "wikipedia_url": "https://sr.wikipedia.org/sr-el/1._пролетерска_дивизија_НОВЈ"
}
```

**Output (enriched JSON):**
```json
{
  "name": "1. proleterska udarna divizija",
  "formation_date": "1942-11-01",
  "formation_site": "Livno",
  "formation_geo": {
    "latitude": 43.8267,
    "longitude": 17.0081
  },
  "composition": "1. proleterska, 3. proleterska i 3. krajiška brigada",
  "wikipedia_url": "https://sr.wikipedia.org/sr-el/1._пролетерска_дивизија_НОВЈ"
}
```

If the formation site or geocoordinates cannot be determined, the fields will be `null`.

## Example Workflow

```bash
# 1. Export divisions from database
node scripts/exportDivisions.js

# 2. Update with formation sites and coordinates
node scripts/updateDivisionSites.js divisions_data.json

# 3. Review the updated file: divisions_data_updated.json
```

See `divisions_data_example_output.json` for an example of what the enriched output looks like.

## Notes

- The script skips divisions that already have a `formation_site` value
- The script skips divisions without a `wikipedia_url`
- Wikipedia content is fetched with appropriate user-agent headers
- The script implements rate limiting to avoid overwhelming the APIs
- Both formation site and geocoordinates include confidence levels (high/medium/low/none)
- The OpenAI model used is `gpt-4o` for better accuracy with multilingual content

## Troubleshooting

### Database Connection Errors
- Verify your `.env` file contains correct database credentials
- Ensure the MySQL server is running
- Check that the database and table exist

### OpenAI API Errors
- Verify your `OPENAI_API_KEY` in the `.env` file
- Check your OpenAI account has sufficient credits
- Ensure you have access to the `gpt-4o` model

### Wikipedia Fetch Errors
- Some Wikipedia pages may be temporarily unavailable
- The script includes retry logic for transient failures
- Check internet connectivity

## Cost Estimation

OpenAI API costs (approximate, as of 2024):
- Formation site extraction: ~$0.01-0.02 per division
- Geocoordinate lookup: ~$0.005-0.01 per division
- Total per division: ~$0.015-0.03

For 50 divisions: ~$0.75-$1.50 total
