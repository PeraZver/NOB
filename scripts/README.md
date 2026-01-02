# Division Data Enrichment Scripts

Quick guide to enrich your incomplete WW2 division JSON data with formation sites and geocoordinates.

## Quick Start

### 1. If you have a JSON file already

```bash
node scripts/updateDivisionSites.js your_divisions.json
```

This will create `your_divisions_updated.json` with formation sites and geocoordinates added.

### 2. If you need to export from database first

```bash
# Export divisions from database
node scripts/exportDivisions.js

# Then enrich the exported data
node scripts/updateDivisionSites.js divisions_data.json
```

## What you need

1. **Node.js** installed
2. **OpenAI API key** - Add to `.env` file:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
3. **Input JSON file** with at least:
   - `name`: Division name
   - `formation_date`: Formation date
   - `wikipedia_url`: Wikipedia URL for the division

## Example

**Input (incomplete):**
```json
[
  {
    "name": "1. proleterska udarna divizija",
    "formation_date": "1942-11-01",
    "composition": "1. proleterska, 3. proleterska i 3. krajiška brigada",
    "wikipedia_url": "https://sr.wikipedia.org/sr-el/1._пролетерска_дивизија_НОВЈ"
  }
]
```

**Output (enriched):**
```json
[
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
]
```

## How it works

1. **Fetches Wikipedia** content from each division's URL
2. **Uses OpenAI** to analyze the content and extract formation site
3. **Gets geocoordinates** for the formation site using OpenAI
4. **Updates JSON** with the new data

## Testing

Run the validation tests:
```bash
node scripts/testDivisionScripts.js
```

## Full Documentation

See [docs/DIVISION_DATA_ENRICHMENT.md](../docs/DIVISION_DATA_ENRICHMENT.md) for complete documentation.

## Notes

- The script skips divisions that already have `formation_site`
- Rate limiting is built-in to avoid overwhelming APIs
- Cost is approximately $0.02-0.03 per division
- Works with Serbian/Cyrillic Wikipedia pages
