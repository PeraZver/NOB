# Quick Start Guide - Brigade Markdown Generation

This guide shows you how to use the brigade markdown generator with the provided `brigades_croatia.json` file.

## Prerequisites

1. **Get an OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Copy it for use below

2. **Install Dependencies** (if not already done)
   ```bash
   npm install
   ```

## Quick Usage

### 1. Test with Dry Run (No API Key Needed)

See what files would be created without making API calls:

```bash
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -3 --dry-run
```

This will show:
- Which brigades will be processed
- What filenames will be created
- No API calls or file creation

### 2. Generate First 3 Brigades (Recommended for Testing)

```bash
export OPENAI_API_KEY=your_key_here
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -3
```

This will:
- Process only the first 3 brigades
- Fetch Wikipedia content
- Use GPT-4 to translate and extract information
- Create 3 markdown files in `/public/assets/brigades/`

Expected output files:
- `1st_li.md` - 1. lička proleterska udarna brigada "Marko Orešković"
- `2nd_li.md` - 2. lička proleterska udarna brigada
- `4th_kord.md` - 4. kordunaška udarna brigada

### 3. Process All Brigades

Once you're satisfied with the results:

```bash
export OPENAI_API_KEY=your_key_here
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -a
```

Or simply:
```bash
export OPENAI_API_KEY=your_key_here
node scripts/generateBrigadeMarkdown.js brigades_croatia.json
```

## Sample Output

Check the sample files already created:
- `/public/assets/brigades/1st_li_SAMPLE.md`
- `/public/assets/brigades/2nd_li_SAMPLE.md`
- `/public/assets/brigades/4th_kord_SAMPLE.md`

These show the expected format with:
- Formation details (date, place, battalions, strength, commanders)
- Operations narrative organized chronologically
- Proper markdown formatting

## Available Options

```bash
node scripts/generateBrigadeMarkdown.js <json-file> [options]

Options:
  -3, -5, -10    Process first N brigades
  -a, --all      Process all brigades (default)
  --dry-run      Test without API calls or file creation
  --help         Show help message
```

## Examples

```bash
# Test first 5 brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -5

# Process first 10 brigades
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -10

# Process all brigades with dry run first
node scripts/generateBrigadeMarkdown.js brigades_croatia.json --dry-run
node scripts/generateBrigadeMarkdown.js brigades_croatia.json -a
```

## Expected Processing Time

- **Per brigade**: ~3-4 seconds
- **3 brigades**: ~10-15 seconds
- **10 brigades**: ~40-50 seconds
- **All brigades**: Varies based on total count

Rate limiting (2 second delay between requests) prevents API throttling.

## Troubleshooting

### "OPENAI_API_KEY not set"
```bash
export OPENAI_API_KEY=your_key_here
```
Or add it to your `.env` file.

### "File not found"
Make sure you're in the project root directory and the JSON file exists.

### Wikipedia fetch fails
Some URLs may be inaccessible. The script will log the error and continue with the next brigade.

### AI processing fails
The script retries up to 2 times with a 3-second delay. If it still fails, it logs the error and continues.

## Cost Estimation (OpenAI API)

Using GPT-4:
- **Input**: ~50k characters per brigade (Wikipedia content)
- **Output**: ~4k characters per brigade (markdown)
- **Estimated cost**: ~$0.02-0.05 per brigade with GPT-4
- **For 100 brigades**: ~$2-5 USD

Using GPT-4o-mini (if you want lower cost):
- Edit the script and change `model: "gpt-4o"` to `model: "gpt-4o-mini"`
- Much cheaper: ~$0.002-0.005 per brigade
- Still produces good results

## Next Steps

1. Run the script with `-3` to test
2. Review the generated markdown files
3. If satisfied, run with `-a` to process all
4. The files are automatically available to your application

For detailed documentation, see: `docs/BRIGADE_MARKDOWN_GENERATION.md`
