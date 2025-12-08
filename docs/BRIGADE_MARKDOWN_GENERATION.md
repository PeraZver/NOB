# Brigade Markdown Generation Guide

This guide explains how to generate markdown files for brigade entries from Wikipedia content.

## Overview

The solution consists of two scripts:
1. **exportBrigades.js** - Exports brigade data from the database to JSON
2. **generateBrigadeMarkdown.js** - Fetches Wikipedia content and generates formatted markdown files

## Prerequisites

### 1. Node.js Dependencies

Install required packages (already done if you ran `npm install`):
```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root (use `.env.example` as template):

```env
# Database Configuration (for exportBrigades.js)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nob

# API Configuration (for generateBrigadeMarkdown.js)
OPENAI_API_KEY=your_openai_api_key_here
```

**Important:** You need an OpenAI API key. Get one at: https://platform.openai.com/api-keys

## Quick Start

### Option 1: Using Existing Database

If you have the database running with brigade data:

```bash
# Step 1: Export brigade data from database
node scripts/exportBrigades.js

# Step 2: Set your API key (if not in .env)
export OPENAI_API_KEY=your_api_key_here

# Step 3: Generate markdown files
node scripts/generateBrigadeMarkdown.js brigades_data.json
```

### Option 2: Using a JSON File

If you already have a JSON file with brigade data:

```bash
# Set your API key (if not in .env)
export OPENAI_API_KEY=your_api_key_here

# Generate markdown files
node scripts/generateBrigadeMarkdown.js path/to/your/brigades.json
```

### Option 3: Testing with Sample Data

A sample JSON file is provided for testing:

```bash
# Dry run (no API calls, just test filenames)
node scripts/generateBrigadeMarkdown.js brigades_sample.json --dry-run

# Process only the first 3 brigades (useful for testing)
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -3

# Process all brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -a
```

### Processing Limits

You can control how many brigades to process using the limit flag:

```bash
# Process only the first 3 brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -3

# Process only the first 5 brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -5

# Process all brigades (default behavior)
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -a
# or simply
node scripts/generateBrigadeMarkdown.js brigades_croatia.json
```

This is particularly useful when:
- Testing the script with real data
- Saving on API costs
- Processing brigades in batches

## JSON File Format

The input JSON file should contain an array of brigade objects with at least these fields:

```json
[
  {
    "id": 1,
    "name": "5. dalmatinska udarna brigada",
    "formation_date": "1943-12-15",
    "formation_site": "Drniš",
    "wikipedia_url": "https://hr.wikipedia.org/wiki/5._dalmatinska_brigada"
  }
]
```

**Required fields:**
- `name` - Brigade name (used for generating filename and extracting info)
- `wikipedia_url` - URL to Wikipedia article (can be in any language)

**Optional fields:**
- `id`, `formation_date`, `formation_site` - For reference, not used by the script

## How It Works

1. **Reads JSON file** - Loads brigade data from the specified file

2. **Generates filename** - Converts brigade name to filename format:
   - "5. dalmatinska udarna brigada" → "5th_dalm.md"
   - "1. dalmatinska proleterska brigada" → "1st_dalm.md"
   - Uses proper ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)

3. **Fetches Wikipedia content** - Downloads the full article from the URL

4. **AI Processing** - Uses GPT-4 AI to:
   - Translate content to English if needed
   - Extract formation details (date, place, battalions, strength, commanders)
   - Summarize operations and war path
   - Format as markdown following the template

5. **Saves markdown file** - Writes to `/public/assets/brigades/`

## Output Format

Each generated markdown file follows this structure:

```markdown
# Brigade Name

## Formation
 - **Date of formation**: Month Day, Year
 - **Place of formation**: Location
 - **Constituent battalions**: 
\t- Battalion 1
\t- Battalion 2
 - **Strength at the time**: Number of fighters
 - **Commander**: Commander name
 - **Commissar**: Commissar name

## Operations
Detailed narrative of operations...
```

## Command Options

### generateBrigadeMarkdown.js

```bash
node scripts/generateBrigadeMarkdown.js <json-file> [--dry-run]
```

**Options:**
- `--dry-run` - Test without fetching content or creating files
- `--help, -h` - Show help message

**Examples:**
```bash
# Test filename generation
node scripts/generateBrigadeMarkdown.js brigades_sample.json --dry-run

# Generate with sample data
node scripts/generateBrigadeMarkdown.js brigades_sample.json

# Generate from database export
node scripts/generateBrigadeMarkdown.js brigades_data.json
```

### exportBrigades.js

```bash
node scripts/exportBrigades.js
```

Exports all brigades with Wikipedia URLs to `brigades_data.json`.

## Rate Limiting and Performance

- The script includes a 2-second delay between processing each brigade
- This prevents rate limiting from Wikipedia and the AI service
- For 10 brigades, expect ~30-40 seconds of processing time
- For 50 brigades, expect ~3-4 minutes

## Error Handling

The script handles various errors gracefully:

- **Missing Wikipedia URL**: Skipped with message
- **Failed Wikipedia fetch**: Skipped, error logged
- **AI processing error**: Retries up to 2 times with 3-second delay
- **Network issues**: Logged with details

At the end, you'll see a summary:
```
=== Summary ===
Processed: 8
Failed: 2
Total: 10
```

## Troubleshooting

### "OPENAI_API_KEY not set"

**Solution:** Set the API key:
```bash
export OPENAI_API_KEY=your_key_here
# Or add it to .env file
```

### "Error fetching Wikipedia page"

**Possible causes:**
- Invalid Wikipedia URL
- Network connectivity issue
- Page doesn't exist

**Solution:** Check the URL in a browser first

### "Error processing with AI"

**Possible causes:**
- Invalid API key
- API rate limit reached
- Network issue

**Solution:** 
- Verify your API key is correct
- Wait a few minutes and retry
- Check your OpenAI account usage

### Database Connection Failed (exportBrigades.js)

**Solution:** 
- Ensure MySQL is running
- Verify credentials in `.env` file
- Check database name

## Files Generated

Generated markdown files are saved to:
```
/public/assets/brigades/
```

Examples:
- `1st_dalm.md` - 1st Dalmatian Brigade
- `2nd_dalm.md` - 2nd Dalmatian Brigade
- `5th_dalm.md` - 5th Dalmatian Brigade

## Next Steps

After generating the markdown files:

1. Review the generated files for accuracy
2. Make any necessary manual corrections
3. The files are automatically used by the application's sidebar
4. Test by clicking on brigade markers in the map

## Support

For issues or questions:
1. Check the script output for error messages
2. Review this guide
3. Check the main README.md
4. Open an issue on GitHub

## Credits

- Wikipedia content is used under Creative Commons licenses
- AI processing powered by OpenAI's GPT-4
- Script created for the NOB (People's Liberation Struggle) project
