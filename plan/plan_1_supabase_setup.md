# Implementation Plan 1: Project Initialization & Supabase Setup

## Overview
This phase focus on setting up the backend infrastructure and the foundational project structure for Cartographer.

## Tasks
1. **Infrastructure Setup**
   - [ ] Initialize Supabase project.
   - [ ] Configure Auth providers (Google, Apple, Facebook).
   - [ ] Enable Supabase Realtime for `shopping_lists` table.

2. **Database Schema**
   - [ ] Create `profiles` table:
     - `id` (uuid, primary key)
     - `home_country` (text)
     - `preferred_language` (text)
     - `dietary_preferences` (text[])
   - [ ] Create `shopping_lists` table:
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to profiles)
     - `title` (text)
     - `status` (enum: planning, shopping, completed)
   - [ ] Create `list_items` table:
     - `id` (uuid, primary key)
     - `list_id` (uuid, foreign key)
     - `original_ingredient` (text)
     - `us_equivalent_brand` (text)
     - `match_score` (int)
     - `aisle_location` (text)
     - `is_verified` (boolean)

3. **Frontend Scaffold**
   - [ ] Initialize mobile project (e.g., React Native or Expo).
   - [ ] Install Supabase client SDK.
   - [ ] Configure environment variables.
