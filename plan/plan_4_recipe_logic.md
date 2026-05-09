# Implementation Plan 4: Recipe Importer & Substitution Logic

## Overview
Implementing the "Planning Mode" hero feature that translates recipes into shoppable US lists.

## Tasks
1. **Recipe Input Handler**
   - [ ] Build input field for dish names or recipe URLs.
   - [ ] Implement AI extraction prompt (e.g. "Extract ingredients for [Dish] and map to US staples").

2. **Substitution Engine**
   - [ ] Integrate with an LLM (Gemini Flash) to generate:
     - Closest US Brand/Item.
     - Match Score (%).
     - Preparation Tip (Cultural context).
   - [ ] Implement "Value vs Quality" toggle logic.

3. **List Management**
   - [ ] Create/Update lists in Supabase.
   - [ ] Implement "Export to Instacart" deep-link functionality.
