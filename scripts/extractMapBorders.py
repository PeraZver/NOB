#!/usr/bin/env python3
"""
Historical Map Border Extraction Tool

This script extracts borders from a historical map image and converts them to GeoJSON format.
It uses OpenCV for image processing and implements georeferencing to align the extracted
borders with real-world coordinates.

Usage:
    python extractMapBorders.py <input_image> <output_geojson> [--gcps gcp_file]

Ground Control Points (GCPs) format (JSON):
    [
        {"pixel": [x, y], "coords": [lng, lat]},
        ...
    ]
"""

import sys
import json
import argparse
import numpy as np
import cv2
from typing import List, Tuple, Dict, Any


class HistoricalMapProcessor:
    """Process historical maps to extract borders and convert to GeoJSON."""
    
    def __init__(self, image_path: str):
        """Initialize with the path to the historical map image."""
        self.image_path = image_path
        self.image = cv2.imread(image_path)
        if self.image is None:
            raise ValueError(f"Could not load image: {image_path}")
        self.height, self.width = self.image.shape[:2]
        self.transform_matrix = None
        
    def set_ground_control_points(self, gcps: List[Dict[str, List[float]]]):
        """
        Set ground control points for georeferencing.
        
        Args:
            gcps: List of dicts with 'pixel' [x, y] and 'coords' [lng, lat]
        """
        if len(gcps) < 3:
            raise ValueError("At least 3 ground control points are required")
        
        # Extract pixel coordinates and geographic coordinates
        src_points = np.float32([gcp['pixel'] for gcp in gcps])
        dst_points = np.float32([gcp['coords'] for gcp in gcps])
        
        # Calculate affine transformation matrix if we have exactly 3 points
        # or use perspective transformation for 4+ points
        if len(gcps) == 3:
            self.transform_matrix = cv2.getAffineTransform(src_points[:3], dst_points[:3])
            self.transform_type = 'affine'
        else:
            self.transform_matrix = cv2.getPerspectiveTransform(src_points[:4], dst_points[:4])
            self.transform_type = 'perspective'
    
    def pixel_to_coords(self, x: float, y: float) -> Tuple[float, float]:
        """
        Convert pixel coordinates to geographic coordinates (longitude, latitude).
        
        Args:
            x: Pixel x coordinate
            y: Pixel y coordinate
            
        Returns:
            Tuple of (longitude, latitude)
        """
        if self.transform_matrix is None:
            raise ValueError("Ground control points not set. Call set_ground_control_points first.")
        
        point = np.array([[[x, y]]], dtype=np.float32)
        
        if self.transform_type == 'affine':
            # For affine transformation
            transformed = cv2.transform(point, self.transform_matrix)
        else:
            # For perspective transformation
            transformed = cv2.perspectiveTransform(point, self.transform_matrix)
        
        lng, lat = transformed[0][0]
        return float(lng), float(lat)
    
    def extract_borders(self, 
                       canny_low: int = 50,
                       canny_high: int = 150,
                       min_area: int = 1000) -> List[np.ndarray]:
        """
        Extract borders from the map using edge detection and contour finding.
        
        Args:
            canny_low: Lower threshold for Canny edge detection
            canny_high: Upper threshold for Canny edge detection
            min_area: Minimum contour area to keep
            
        Returns:
            List of contours (each contour is an array of points)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply Canny edge detection
        edges = cv2.Canny(blurred, canny_low, canny_high)
        
        # Dilate edges to connect nearby contours
        kernel = np.ones((3, 3), np.uint8)
        dilated = cv2.dilate(edges, kernel, iterations=1)
        
        # Find contours
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by area
        filtered_contours = [cnt for cnt in contours if cv2.contourArea(cnt) >= min_area]
        
        # Simplify contours to reduce point count
        simplified_contours = []
        for contour in filtered_contours:
            epsilon = 0.005 * cv2.arcLength(contour, True)
            simplified = cv2.approxPolyDP(contour, epsilon, True)
            simplified_contours.append(simplified)
        
        return simplified_contours
    
    def contours_to_geojson(self, contours: List[np.ndarray], 
                           properties: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Convert contours to GeoJSON FeatureCollection.
        
        Args:
            contours: List of contours from extract_borders()
            properties: Optional properties to add to each feature
            
        Returns:
            GeoJSON FeatureCollection dict
        """
        if self.transform_matrix is None:
            raise ValueError("Ground control points not set. Call set_ground_control_points first.")
        
        features = []
        
        for i, contour in enumerate(contours):
            # Convert contour points to geographic coordinates
            geo_coords = []
            for point in contour:
                x, y = point[0]
                lng, lat = self.pixel_to_coords(float(x), float(y))
                geo_coords.append([lng, lat])
            
            # Close the polygon if it's not already closed
            if geo_coords[0] != geo_coords[-1]:
                geo_coords.append(geo_coords[0])
            
            # Create feature
            feature = {
                "type": "Feature",
                "properties": properties or {
                    "name": f"Border {i + 1}",
                    "source": "historical_map",
                    "color": "#ff0000"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [geo_coords]
                }
            }
            features.append(feature)
        
        # Create FeatureCollection
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return geojson
    
    def save_debug_image(self, contours: List[np.ndarray], output_path: str):
        """Save an image with contours drawn for debugging purposes."""
        debug_image = self.image.copy()
        cv2.drawContours(debug_image, contours, -1, (0, 255, 0), 2)
        cv2.imwrite(output_path, debug_image)
        print(f"Debug image saved to: {output_path}")


def load_gcps_from_file(gcp_file: str) -> List[Dict[str, List[float]]]:
    """Load ground control points from a JSON file."""
    with open(gcp_file, 'r') as f:
        gcps = json.load(f)
    return gcps


def create_default_gcps(width: int, height: int) -> List[Dict[str, List[float]]]:
    """
    Create default ground control points for testing.
    This assumes the map covers approximately the Balkans region.
    """
    # Default: corners of the image mapped to a rough Balkans bounding box
    # [lng, lat] for: SW, SE, NE, NW corners
    return [
        {"pixel": [0, height], "coords": [13.0, 40.0]},      # Bottom-left (SW)
        {"pixel": [width, height], "coords": [23.0, 40.0]},  # Bottom-right (SE)
        {"pixel": [width, 0], "coords": [23.0, 47.0]},       # Top-right (NE)
        {"pixel": [0, 0], "coords": [13.0, 47.0]}            # Top-left (NW)
    ]


def main():
    parser = argparse.ArgumentParser(
        description='Extract borders from historical map and convert to GeoJSON'
    )
    parser.add_argument('input_image', help='Path to input historical map image')
    parser.add_argument('output_geojson', help='Path to output GeoJSON file')
    parser.add_argument('--gcps', help='Path to ground control points JSON file')
    parser.add_argument('--canny-low', type=int, default=50, 
                       help='Lower threshold for Canny edge detection')
    parser.add_argument('--canny-high', type=int, default=150,
                       help='Upper threshold for Canny edge detection')
    parser.add_argument('--min-area', type=int, default=1000,
                       help='Minimum contour area to keep')
    parser.add_argument('--debug-image', help='Path to save debug image with contours')
    parser.add_argument('--properties', help='JSON string with feature properties')
    
    args = parser.parse_args()
    
    # Initialize processor
    print(f"Loading image: {args.input_image}")
    processor = HistoricalMapProcessor(args.input_image)
    print(f"Image size: {processor.width}x{processor.height}")
    
    # Load or create ground control points
    if args.gcps:
        print(f"Loading ground control points from: {args.gcps}")
        gcps = load_gcps_from_file(args.gcps)
    else:
        print("No GCPs provided, using default corner points for Balkans region")
        gcps = create_default_gcps(processor.width, processor.height)
    
    processor.set_ground_control_points(gcps)
    print(f"Set {len(gcps)} ground control points")
    
    # Extract borders
    print("Extracting borders...")
    contours = processor.extract_borders(
        canny_low=args.canny_low,
        canny_high=args.canny_high,
        min_area=args.min_area
    )
    print(f"Found {len(contours)} contours")
    
    # Save debug image if requested
    if args.debug_image:
        processor.save_debug_image(contours, args.debug_image)
    
    # Parse properties if provided
    properties = None
    if args.properties:
        properties = json.loads(args.properties)
    
    # Convert to GeoJSON
    print("Converting to GeoJSON...")
    geojson = processor.contours_to_geojson(contours, properties)
    
    # Save GeoJSON
    with open(args.output_geojson, 'w') as f:
        json.dump(geojson, f, indent=2)
    
    print(f"GeoJSON saved to: {args.output_geojson}")
    print(f"Total features: {len(geojson['features'])}")


if __name__ == '__main__':
    main()
