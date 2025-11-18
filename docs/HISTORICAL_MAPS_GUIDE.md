# Historical Map Border Extraction

This document explains how to extract borders from historical maps and overlay them on the interactive map.

## Overview

The historical map extraction system allows you to:
1. Process scanned historical maps to extract border lines
2. Convert extracted borders to vector format (GeoJSON)
3. Georeference the borders to align with modern coordinates
4. Display the borders as an overlay on the Leaflet map

## Prerequisites

### Python Environment

Install the required Python dependencies:

```bash
pip install -r requirements.txt
```

Required packages:
- `opencv-python` >= 4.8.0 - For image processing
- `numpy` >= 1.24.0 - For numerical operations

## Step-by-Step Guide

### 1. Prepare Your Historical Map

- Scan or photograph the historical map at high resolution (minimum 300 DPI recommended)
- Save as JPG, PNG, or other common image format
- Ensure the map is properly lit and borders are clearly visible

### 2. Identify Ground Control Points (GCPs)

Ground control points link pixel coordinates in your image to real-world geographic coordinates. You need at least 4 GCPs for accurate georeferencing.

**How to find GCPs:**
1. Identify recognizable features in your map (cities, rivers, coastlines, borders)
2. Find their modern coordinates using tools like Google Maps or OpenStreetMap
3. Note the pixel coordinates in your image (use an image editor to find x,y positions)

**Create a GCP file** (`my-map-gcps.json`):

```json
[
  {
    "pixel": [100, 800],
    "coords": [15.5, 43.0],
    "description": "City of Split"
  },
  {
    "pixel": [600, 800],
    "coords": [20.5, 43.5],
    "description": "City of Sarajevo"
  },
  {
    "pixel": [600, 200],
    "coords": [20.0, 46.0],
    "description": "City of Zagreb"
  },
  {
    "pixel": [100, 200],
    "coords": [15.0, 46.0],
    "description": "Ljubljana area"
  }
]
```

**Tips for selecting GCPs:**
- Use corners or edges of the map when possible
- Distribute points evenly across the map
- More GCPs improve accuracy
- Use distinctive geographic features that haven't changed

### 3. Extract Borders

Run the extraction script:

```bash
python scripts/extractMapBorders.py \
  path/to/your-historical-map.jpg \
  public/assets/extracted-borders.json \
  --gcps path/to/my-map-gcps.json \
  --debug-image /tmp/debug-borders.jpg
```

**Parameters:**
- First argument: Path to your historical map image
- Second argument: Output GeoJSON file path
- `--gcps`: Path to ground control points JSON file
- `--debug-image`: (Optional) Save an image showing detected borders
- `--canny-low`: (Optional) Lower threshold for edge detection (default: 50)
- `--canny-high`: (Optional) Upper threshold for edge detection (default: 150)
- `--min-area`: (Optional) Minimum contour area in pixels (default: 1000)

### 4. Fine-tune Extraction Parameters

If the extracted borders don't look right, try adjusting these parameters:

**For maps with faint borders:**
```bash
python scripts/extractMapBorders.py \
  your-map.jpg output.json \
  --gcps gcps.json \
  --canny-low 30 \
  --canny-high 100
```

**For maps with very clear, thick borders:**
```bash
python scripts/extractMapBorders.py \
  your-map.jpg output.json \
  --gcps gcps.json \
  --canny-low 100 \
  --canny-high 200
```

**To filter out small artifacts:**
```bash
python scripts/extractMapBorders.py \
  your-map.jpg output.json \
  --gcps gcps.json \
  --min-area 5000
```

### 5. Customize Border Appearance

You can add custom properties to the extracted borders by using the `--properties` flag:

```bash
python scripts/extractMapBorders.py \
  your-map.jpg output.json \
  --gcps gcps.json \
  --properties '{"name": "WWII Front Lines", "year": "1943", "color": "#FF5733"}'
```

### 6. Add to the Map

1. Save the extracted GeoJSON to `public/assets/` directory
2. Update `public/assets/historical-borders.json` or create a new file
3. The borders will automatically appear when you click "Historical Maps" in the menu

## Example Workflow

Here's a complete example extracting borders from a 1943 Yugoslavia map:

```bash
# 1. Create GCP file for the map
cat > yugoslavia-1943-gcps.json << 'EOF'
[
  {"pixel": [50, 950], "coords": [13.5, 41.0]},
  {"pixel": [850, 950], "coords": [23.0, 41.0]},
  {"pixel": [850, 50], "coords": [23.0, 47.0]},
  {"pixel": [50, 50], "coords": [13.5, 47.0]}
]
EOF

# 2. Extract borders
python scripts/extractMapBorders.py \
  maps/yugoslavia-1943.jpg \
  public/assets/yugoslavia-1943-borders.json \
  --gcps yugoslavia-1943-gcps.json \
  --debug-image /tmp/yugoslavia-debug.jpg \
  --properties '{"name": "Yugoslavia 1943 Borders", "year": "1943", "color": "#8B4513"}'

# 3. Check the debug image
open /tmp/yugoslavia-debug.jpg

# 4. If extraction looks good, the borders are ready to use!
```

## Troubleshooting

### Problem: No borders detected
- **Solution**: Lower the `--canny-low` and `--canny-high` values
- Check the debug image to see what edges were detected
- Ensure your map image has good contrast

### Problem: Too many small artifacts detected
- **Solution**: Increase the `--min-area` parameter
- Use image preprocessing to clean up the scan

### Problem: Borders not aligning with modern map
- **Solution**: Check your GCPs are accurate
- Add more GCPs for better georeferencing
- Ensure GCP coordinates are [longitude, latitude], not [latitude, longitude]

### Problem: Borders are too simplified/blocky
- **Solution**: This is controlled in the code by the epsilon value in `approxPolyDP`
- You can edit the script to reduce the simplification factor

## Advanced Usage

### Manual Border Editing

After extraction, you can manually edit the GeoJSON file to:
- Add or remove border segments
- Adjust coordinates for better accuracy
- Add custom properties and descriptions
- Merge or split polygons

### Combining Multiple Maps

To extract borders from multiple historical maps:

```bash
# Extract from each map
python scripts/extractMapBorders.py map1.jpg borders1.json --gcps gcps1.json
python scripts/extractMapBorders.py map2.jpg borders2.json --gcps gcps2.json

# Manually merge the GeoJSON files
# Combine the "features" arrays from both files
```

### Using Different Coordinate Systems

The script assumes WGS84 coordinates (standard lat/lng). If your map uses a different projection, you'll need to:
1. Convert your GCPs to WGS84 first
2. Or modify the script to handle coordinate transformations

## Technical Details

### How Border Extraction Works

1. **Grayscale Conversion**: Image is converted to grayscale
2. **Gaussian Blur**: Applied to reduce noise
3. **Canny Edge Detection**: Detects edges in the image
4. **Dilation**: Connects nearby edges
5. **Contour Detection**: Finds closed contours
6. **Filtering**: Removes small contours based on area
7. **Simplification**: Reduces point count while preserving shape
8. **Georeferencing**: Transforms pixel coordinates to geographic coordinates
9. **GeoJSON Export**: Converts to standard GeoJSON format

### Georeferencing Method

The script uses either:
- **Affine transformation** (3 GCPs): Best for maps without perspective distortion
- **Perspective transformation** (4+ GCPs): Better for photos or maps with perspective

## Contributing

If you improve the extraction script or have suggestions:
1. Test your changes thoroughly
2. Document any new parameters
3. Include example output
4. Submit a pull request

## References

- [OpenCV Documentation](https://docs.opencv.org/)
- [GeoJSON Specification](https://geojson.org/)
- [Leaflet GeoJSON Documentation](https://leafletjs.com/reference.html#geojson)
