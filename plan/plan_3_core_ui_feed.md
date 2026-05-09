# Implementation Plan 3: Core UI & Unified Feed

## Overview
Establishing the main navigation and the "Companion" feed that serves as the app's central hub.

## Tasks
1. **Navigation Architecture**
   - [ ] Implement Bottom Tab Navigation (Feed, Map, List, Profile).
   - [ ] Ensure the central "Magic Lens" button is elevated/distinct.

2. **Unified Feed Components**
   - [ ] Build Global Search Bar (Input + AI search trigger).
   - [ ] Build "Active Smart List" widget (Progress bar + store suggestion).
   - [ ] Build "Recent Scans" or "Daily Tip" card for the feed.

3. **Global Search Logic**
   - [ ] Integrate Search API (e.g. Algolia or Supabase Search) for ingredient matching.
   - [ ] Build Search Results view with Match Scores.
