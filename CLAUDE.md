# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
bun install

# Run development server with hot reload (port 3002)
bun run dev

# Convert XLSX camp data to JSON (with geocoding)
bun xlsx-to-json.ts data/FCPA\ Camp\ Spreadsheet.xlsx data/fcpa-camps.json
```

## Architecture

This is a Fairfax County Parks summer camp explorer - a React SPA with a Bun backend.

### Data Flow
1. **Source**: `data/FCPA Camp Spreadsheet.xlsx` - raw camp data from FCPA
2. **Conversion**: `xlsx-to-json.ts` parses the XLSX, infers types (dates, times, ages, fees), geocodes locations via Nominatim (cached in `data/.geocode-cache.json`), and outputs structured JSON
3. **API**: `index.ts` serves `data/fcpa-camps.json` at `/api/camps`
4. **Frontend**: `frontend.tsx` fetches and renders camps with filtering

### Key Files
- `index.ts` - Bun server with HTML import and API route
- `frontend.tsx` - Single-file React app (~900 lines) with all components inline
- `index.html` - Entry point with Tailwind CDN config and custom CSS
- `xlsx-to-json.ts` - Data pipeline with geocoding and type inference
- `data/location-addresses.json` - Manual address mappings for geocoding failures

### Frontend State
- Filter state persists to URL params (`q`, `cat`, `comm`, `loc`, `week`, `minAge`, `maxAge`, `maxFee`, `view`)
- Map uses Leaflet loaded dynamically from CDN
- Custom marker icons rendered as inline SVG

## Bun-Specific

- Use `Bun.serve()` with routes and HTML imports (not Express or Vite)
- Use `Bun.file()` for file I/O
- Bun automatically loads `.env` files
- Run tests with `bun test`
