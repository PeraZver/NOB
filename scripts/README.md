# Brigade Markdown Generator Scripts

This directory contains scripts for generating markdown documentation files for brigade entries.

## Scripts

### exportBrigades.js

Exports brigade data from the database to a JSON file.

**Usage:**
```bash
node scripts/exportBrigades.js
```

**Requirements:**
- `.env` file with database credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- Database must be running and accessible

**Output:**
- Creates `brigades_data.json` in the project root with all brigades that have Wikipedia URLs

### generateBrigadeMarkdown.js

Generates markdown files for brigades from Wikipedia content.

**Usage:**
```bash
node scripts/generateBrigadeMarkdown.js <path-to-json-file> [options]
```

**Options:**
- `--dry-run`: Test the script without fetching content or creating files
- `-<number>`: Process only the first N brigades (e.g., `-3` for first 3)
- `-a, --all`: Process all brigades (default)
- `--help, -h`: Show help message

**Examples:**
```bash
# Process only the first 3 brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -3

# Process all brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -a

# Test without API key (dry-run)
node scripts/generateBrigadeMarkdown.js brigades_sample.json --dry-run
```

**Requirements:**
- `OPENAI_API_KEY` environment variable set with a valid OpenAI API key (get from https://platform.openai.com/api-keys)
- Input JSON file with brigade data containing at least:
  - `name`: Brigade name
  - `wikipedia_url`: URL to Wikipedia article

**Process:**
1. Reads brigade data from JSON file
2. For each brigade (up to the specified limit):
   - Fetches Wikipedia content from the provided URL
   - Uses AI (GPT-4) to translate to English if needed
   - Extracts formation details (date, place, battalions, strength, commanders)
   - Summarizes operations and war path
   - Generates formatted markdown file
3. Saves markdown files to `/public/assets/brigades/`

**Filename Convention:**
- Brigade name "5. dalmatinska udarna brigada" → "5th_dalm.md"
- Brigade name "1. dalmatinska proleterska brigada" → "1th_dalm.md"
- Extracts number and first 4 letters of significant word

**Output Format:**
```markdown
# Brigade Name

## Formation
 - **Date of formation**: Month Day, Year
 - **Place of formation**: Location name
 - **Constituent battalions**: 
\t- Battalion 1
\t- Battalion 2
 - **Strength at the time**: Number of fighters
 - **Commander**: Commander name
 - **Commissar**: Commissar name

## Operations
Detailed narrative of the brigade's operations...
```

## Complete Workflow

1. **Export brigade data from database:**
   ```bash
   node scripts/exportBrigades.js
   ```

2. **Set up API key:**
   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

3. **Generate markdown files:**
   ```bash
   node scripts/generateBrigadeMarkdown.js brigades_data.json
   ```

4. **Generated files will be in:**
   ```
   /public/assets/brigades/
   ```

## Notes

- The script includes a 2-second delay between processing each brigade to avoid rate limiting
- Wikipedia content is fetched with a user agent to comply with Wikipedia's guidelines
- If information is not found in Wikipedia content, it will be marked as "Information not available"
- The AI translation and summarization ensure consistent English output regardless of source language
