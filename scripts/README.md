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
# Mode 1: Process brigades from JSON file
node scripts/generateBrigadeMarkdown.js <path-to-json-file> [options]

# Mode 2: Process single brigade by ID from database
node scripts/generateBrigadeMarkdown.js --id <brigade-id> [options]
```

**Options:**
- `--dry-run`: Test the script without fetching content or creating files
- `-<number>`: Process only the first N brigades (e.g., `-3` for first 3)
- `-a, --all`: Process all brigades (default)
- `--id <number>`: Process a single brigade by database ID
- `--force`: Force recreation of existing markdown files (with --id)
- `--help, -h`: Show help message

**Examples:**
```bash
# Process only the first 3 brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -3

# Process all brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -a

# Test without API key (dry-run)
node scripts/generateBrigadeMarkdown.js brigades_sample.json --dry-run

# Process single brigade by ID
node scripts/generateBrigadeMarkdown.js --id 5

# Force recreation without prompt
node scripts/generateBrigadeMarkdown.js --id 10 --force
```

**Requirements:**
- `OPENAI_API_KEY` environment variable set with a valid OpenAI API key (get from https://platform.openai.com/api-keys)
- For `--id` mode: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` environment variables
- For JSON mode: Input JSON file with brigade data containing at least:
  - `name`: Brigade name
  - `wikipedia_url`: URL to Wikipedia article

**Features:**
1. **Existing File Detection**: Checks if markdown file already exists and prompts user before recreating
2. **Brigade Name Translation**: Automatically translates brigade names to English for markdown titles
3. **Database Integration**: Can process individual brigades directly from database by ID
4. **Automatic Database Updates**: Updates `description` column in brigades table
   - If NULL: Automatically adds filename
   - If matches: Confirms and skips
   - If differs: Prompts user to update

**Process:**
1. Reads brigade data from JSON file or database
2. For each brigade (up to the specified limit):
   - Checks if markdown file already exists (prompts user if found)
   - Translates brigade name to English
   - Fetches Wikipedia content from the provided URL
   - Uses AI (GPT-4) to translate content to English if needed
   - Extracts formation details (date, place, battalions, strength, commanders)
   - Summarizes operations and war path
   - Generates formatted markdown file with English title
   - Updates database `description` column (if brigade ID available)
3. Saves markdown files to `/public/assets/brigades/`

**Filename Convention:**
- Brigade name "5. dalmatinska udarna brigada" → "5th_dalm.md"
- Brigade name "1. dalmatinska proleterska brigada" → "1st_dalm.md"
- Extracts number and first 4 letters of significant word

**Output Format:**
```markdown
# [English Brigade Name]

## Formation
 - **Date of formation**: Month Day, Year
 - **Place of formation**: Location name
 - **Constituent battalions**: 
   - Battalion 1
   - Battalion 2
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
