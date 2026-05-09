# Master Implementation Plan: Cartographer

This document outlines the phased roadmap for building the Cartographer MVP. Each phase is designed to be atomic and testable.

## 🗺️ Roadmap Overview

### [Phase 1: Project Initialization & Supabase Setup](./plan_1_supabase_setup.md)
*Infrastructure, database schema, and environment configuration.*

### [Phase 2: Onboarding & Authentication](./plan_2_onboarding_auth.md)
*Social login and mandatory cultural profile setup.*

### [Phase 3: Core UI & Unified Feed](./plan_3_core_ui_feed.md)
*Main navigation, home feed, and search results UI.*

### [Phase 4: Recipe Importer & Substitution Logic](./plan_4_recipe_logic.md)
*The AI-driven substitution engine and list management.*

### [Phase 5: Magic Lens (AR/Vision Integration)](./plan_5_magic_lens.md)
*Real-time scanning, computer vision, and AR overlays.*

### [Phase 6: Store Persona Map](./plan_6_store_map.md)
*Geographic store discovery categorized by "vibe and value."*

## 🛠️ Tech Stack (Assumed)
- **Frontend:** React Native / Expo
- **Backend/Auth:** Supabase
- **AI/Vision:** Google Gemini (Vertex AI) / OpenAI
- **Maps:** Mapbox / Google Maps SDK
