# Historical Maps

This layer displays borders and boundaries extracted from historical maps of the region during the People's Liberation Struggle (1941-1945).

## About Historical Map Overlays

The historical borders shown on this map have been:
- Extracted from digitized historical maps using computer vision techniques
- Vectorized as GeoJSON for seamless display at all zoom levels
- Georeferenced to align accurately with modern geographic coordinates

## Features

- **Vectorized Borders**: All borders are stored as vector data (GeoJSON), ensuring they remain sharp and accurate at any zoom level
- **Geographic Accuracy**: Borders are precisely georeferenced using ground control points to align with real-world coordinates
- **Historical Context**: Each border includes metadata about the historical period and source

## Data Sources

The historical borders are extracted from:
- Period maps from 1941-1945
- Military operation maps
- Administrative boundary maps from the WWII era

## Technical Details

### Border Extraction Process

1. **Image Processing**: Historical map images are processed using OpenCV for edge detection
2. **Contour Extraction**: Border lines are identified and extracted as contours
3. **Georeferencing**: Ground control points (GCPs) are used to transform pixel coordinates to geographic coordinates
4. **Vectorization**: Contours are converted to GeoJSON Polygon features
5. **Simplification**: Borders are simplified while maintaining geographic accuracy

### Using the Extraction Tool

To extract borders from your own historical map:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the extraction script
python scripts/extractMapBorders.py \
  path/to/historical-map.jpg \
  public/assets/extracted-borders.json \
  --gcps public/assets/historical-map-gcps.json \
  --debug-image /tmp/debug-contours.jpg
```

### Ground Control Points (GCPs)

GCPs are reference points that link pixel coordinates in the image to real-world geographic coordinates. At least 4 points are recommended:

```json
[
  {"pixel": [0, 600], "coords": [13.5, 40.5]},
  {"pixel": [800, 600], "coords": [23.0, 40.5]},
  {"pixel": [800, 0], "coords": [23.0, 47.0]},
  {"pixel": [0, 0], "coords": [13.5, 47.0]}
]
```

## Contributing

If you have historical maps that should be included, please:
1. Prepare a high-quality scan of the map
2. Identify at least 4 ground control points with known coordinates
3. Submit the map along with GCPs

---

*These historical borders are for educational and research purposes.*
