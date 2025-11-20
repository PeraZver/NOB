# Quick Start: Historical Map Extraction

This guide will get you extracting historical map borders in 5 minutes.

## Prerequisites

```bash
# Install Python dependencies
pip install -r requirements.txt
```

## 5-Minute Setup

### Step 1: Get Your Historical Map
- Find a scanned historical map (JPG, PNG, etc.)
- Or use our test image generator

### Step 2: Create Ground Control Points

Create a file `gcps.json` with 4 corner points:

```json
[
  {"pixel": [0, 600], "coords": [13.5, 40.5]},
  {"pixel": [800, 600], "coords": [23.0, 40.5]},
  {"pixel": [800, 0], "coords": [23.0, 47.0]},
  {"pixel": [0, 0], "coords": [13.5, 47.0]}
]
```

**Tip:** Adjust coordinates to match your map's geographic extent.

### Step 3: Extract Borders

```bash
python scripts/extractMapBorders.py \
  your-map.jpg \
  public/assets/extracted-borders.json \
  --gcps gcps.json \
  --debug-image /tmp/debug.jpg
```

### Step 4: View Results

1. Check the debug image: `open /tmp/debug.jpg`
2. Start the server: `npm start`
3. Open http://localhost:3000
4. Click "Historical Maps" in the menu

## Done!

Your historical borders are now displayed as vector overlays on the map.

## Common Adjustments

### Borders too faint?
```bash
--canny-low 30 --canny-high 100
```

### Too many artifacts?
```bash
--min-area 5000
```

### Wrong geographic position?
Double-check your GCP coordinates are [longitude, latitude], not [latitude, longitude].

## Next Steps

- Read the [full guide](HISTORICAL_MAPS_GUIDE.md) for advanced features
- Customize border colors and styles
- Add multiple historical map layers
- Contribute your extracted borders!

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ModuleNotFoundError | Run `pip install -r requirements.txt` |
| No borders detected | Lower `--canny-low` and `--canny-high` |
| Borders misaligned | Verify GCP coordinates |
| Too many small shapes | Increase `--min-area` |

## Example: Complete Workflow

```bash
# 1. Create GCPs for Yugoslavia 1943 map
cat > yugoslavia-gcps.json << 'EOJ'
[
  {"pixel": [50, 950], "coords": [13.5, 41.0]},
  {"pixel": [850, 950], "coords": [23.0, 41.0]},
  {"pixel": [850, 50], "coords": [23.0, 47.0]},
  {"pixel": [50, 50], "coords": [13.5, 47.0]}
]
EOJ

# 2. Extract borders
python scripts/extractMapBorders.py \
  maps/yugoslavia-1943.jpg \
  public/assets/yugoslavia-borders.json \
  --gcps yugoslavia-gcps.json \
  --debug-image /tmp/yugoslavia-debug.jpg \
  --properties '{"name": "Yugoslavia 1943", "year": "1943", "color": "#8B4513"}'

# 3. View debug output
open /tmp/yugoslavia-debug.jpg

# 4. Start server and view on map
npm start
```

## Getting Help

- See [HISTORICAL_MAPS_GUIDE.md](HISTORICAL_MAPS_GUIDE.md) for detailed documentation
- Check the README for project overview
- Open an issue on GitHub for bugs or questions

Happy mapping! 🗺️
