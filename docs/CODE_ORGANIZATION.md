# Code Organization Documentation

This document describes the refactored code structure of the NOB (People's Liberation Struggle Map) project.

## Overview

The codebase has been reorganized to improve maintainability, readability, and scalability. The refactoring follows common best practices:

- **Separation of Concerns**: Business logic, routing, and utilities are separated
- **DRY (Don't Repeat Yourself)**: Common functionality is extracted into reusable modules
- **Single Responsibility**: Each module has a clear, focused purpose
- **Configuration Management**: Centralized configuration files

## Backend Structure (`src/`)

### File Organization

```
src/
├── app.js                          # Main application entry point (simplified)
├── config/
│   └── config.js                   # Centralized configuration
├── controllers/
│   └── militaryUnitsController.js  # Business logic for military units
├── db/
│   ├── pool.js                     # Database connection pool
│   └── *.sql                       # SQL schema and seed files
├── routes/
│   ├── militaryUnitsRoutes.js      # API routes for military units
│   └── searchRoutes.js             # Search API routes
└── utils/
    └── markdownLoader.js           # Utility for loading markdown files
```

### Module Descriptions

#### `app.js` (Main Entry Point)
- **Before**: 167 lines with mixed responsibilities
- **After**: ~20 lines, focused only on:
  - Express server setup
  - Middleware configuration
  - Route registration
  - Server startup

#### `config/config.js` (Configuration)
- **Purpose**: Centralized configuration management
- **Contains**:
  - Server settings (port)
  - Database connection parameters
  - Path configurations
- **Benefits**: Single source of truth for all configuration

#### `controllers/militaryUnitsController.js` (Business Logic)
- **Purpose**: Handle business logic for military units
- **Functions**:
  - `getMilitaryUnits(tableName, assetFolder)`: Generic function to fetch units from any table
  - `getMilitaryUnitById(tableName, unitId)`: Fetch a single unit by ID
- **Benefits**: 
  - Eliminates code duplication (4 similar endpoints → 1 generic function)
  - Easier to maintain and test
  - Consistent behavior across all unit types

#### `routes/militaryUnitsRoutes.js` (API Routes)
- **Purpose**: Define API endpoints for all military unit types
- **Features**:
  - Generic route factory pattern
  - Handles all unit types (brigades, detachments, divisions, corps)
  - Routes: `GET /api/{unitType}` and `GET /api/{unitType}/:id`
- **Benefits**: DRY principle - one implementation serves all unit types

#### `utils/markdownLoader.js` (Utilities)
- **Purpose**: Helper functions for markdown file operations
- **Functions**:
  - `getMarkdownContent(filePath)`: Async function to read markdown files
- **Benefits**: Reusable across controllers and routes

## Frontend Structure (`public/js/`)

### File Organization

```
public/js/
├── config.js                       # Frontend configuration constants
├── constants.js                    # Icon definitions (unchanged)
├── layerState.js                   # Application state management (unchanged)
├── map.js                          # Map initialization and main UI logic (reduced from 299 to ~170 lines)
├── map_layers.js                   # Layer management (reduced from 258 to ~130 lines)
├── search.js                       # Search functionality (updated to use config)
├── sidebar.js                      # Sidebar management (unchanged)
├── handlers/
│   └── filterHandlers.js           # Event handlers for year/month filtering
└── utils/
    ├── dateUtils.js                # Date formatting utilities
    ├── filterUtils.js              # Data filtering logic
    ├── markerUtils.js              # Marker creation utilities
    └── popupUtils.js               # Popup content generation
```

### Module Descriptions

#### `config.js` (Frontend Configuration)
- **Purpose**: Centralized frontend configuration
- **Contains**:
  - Map configuration (center, zoom levels, tile layers)
  - Occupied territory overlay settings
  - Layer names constants
  - Markdown file paths
  - API endpoint URLs
  - Layer mapping for filtering
- **Benefits**: Easy to modify settings without touching business logic

#### `handlers/filterHandlers.js` (Event Handlers)
- **Purpose**: Handle user interactions for filtering
- **Functions**:
  - `handleYearFilter(year)`: Handle year selection
  - `handleMonthFilter(month)`: Handle month selection
  - `handleCalendarToggle()`: Toggle calendar UI
  - `clearYearFilter()`: Reset filters
- **Benefits**: Separates UI event handling from business logic

#### `utils/dateUtils.js` (Date Utilities)
- **Purpose**: Date formatting functions
- **Functions**:
  - `formatDate(dateString)`: Format dates consistently
- **Benefits**: Reusable, testable, consistent formatting

#### `utils/filterUtils.js` (Filter Logic)
- **Purpose**: Data filtering algorithms
- **Functions**:
  - `filterDataByYear(data, year, month)`: Filter military units by date
- **Benefits**: Separated business logic, easier to test and modify

#### `utils/markerUtils.js` (Marker Management)
- **Purpose**: Leaflet marker creation
- **Functions**:
  - `createMarker(item, icon, onClickHandler)`: Create map markers
- **Benefits**: Consistent marker creation across all layers

#### `utils/popupUtils.js` (Popup Generation)
- **Purpose**: Generate popup content
- **Functions**:
  - `generatePopupContent(properties)`: Create HTML for popups
- **Benefits**: Centralized popup formatting logic

#### `map.js` (Main Map Logic)
- **Before**: 299 lines with mixed responsibilities
- **After**: ~170 lines, focused on:
  - Map initialization
  - Sidebar toggling
  - Layer switching
  - Event listener registration
- **Improvements**: Extracted filter handlers and utility functions

#### `map_layers.js` (Layer Management)
- **Before**: 258 lines including helper functions
- **After**: ~130 lines, focused on:
  - Layer visibility management
  - API data fetching
  - Layer refresh logic
- **Improvements**: Extracted marker creation, filtering, and popup generation

## Migration Guide

### For Developers

1. **Backend Changes**:
   - Import configuration from `src/config/config.js` instead of reading env variables directly
   - Use controller functions instead of inline query logic
   - New API routes are automatically generated for all unit types

2. **Frontend Changes**:
   - Import configuration constants from `config.js`
   - Use utility functions from `utils/` directory for common operations
   - Filter handlers are in `handlers/filterHandlers.js`

### No Breaking Changes

- All API endpoints remain the same (`/api/brigades`, `/api/detachments`, etc.)
- Frontend behavior is identical to users
- Database schema unchanged
- No changes to HTML or CSS

## Benefits of Refactoring

### Maintainability
- Easier to find and fix bugs
- Clear responsibility boundaries
- Reduced code duplication

### Scalability
- Easy to add new military unit types
- Simple to extend functionality
- Modular architecture supports growth

### Testability
- Isolated functions are easier to test
- Utilities can be tested independently
- Business logic separated from presentation

### Readability
- Smaller, focused files
- Clear naming conventions
- Logical organization

## File Size Reduction

### Backend
- `app.js`: 167 lines → ~20 lines (87% reduction)
- Code extracted to:
  - `militaryUnitsController.js`: ~60 lines
  - `militaryUnitsRoutes.js`: ~50 lines
  - `config.js`: ~30 lines
  - `markdownLoader.js`: ~20 lines

### Frontend
- `map.js`: 299 lines → ~170 lines (43% reduction)
- `map_layers.js`: 258 lines → ~130 lines (50% reduction)
- Code extracted to:
  - `filterHandlers.js`: ~130 lines
  - `dateUtils.js`: ~15 lines
  - `filterUtils.js`: ~40 lines
  - `markerUtils.js`: ~25 lines
  - `popupUtils.js`: ~20 lines
  - `config.js`: ~70 lines

## Future Recommendations

1. **Testing**: Add unit tests for utilities and controllers
2. **Error Handling**: Implement consistent error handling middleware
3. **Logging**: Add structured logging throughout the application
4. **Validation**: Add input validation middleware for API routes
5. **Documentation**: Add JSDoc comments to all public functions
6. **Frontend Build**: Consider using a module bundler (webpack/vite) for better frontend organization
