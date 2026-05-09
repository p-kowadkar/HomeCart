# Implementation Plan 2: Onboarding & Authentication

## Overview
Building the "Profile First" mandatory onboarding flow to capture cultural context and establish the user's identity.

## Tasks
1. **Authentication Flow**
   - [ ] Implement Social Login buttons (Google, Apple, Facebook).
   - [ ] Set up Auth State listener to redirect to Onboarding if profile is missing.

2. **Onboarding UI**
   - [ ] Build "Where are you from?" selection screen (Flag grid).
   - [ ] Build "Preferred Language" selection.
   - [ ] Build optional "Dietary Preferences" screen (Vegetarian, Vegan, Halal, etc.).

3. **Data Persistence**
   - [ ] Save selection to Supabase `profiles` table.
   - [ ] Trigger "Initial Success" state and redirect to Home Feed.
