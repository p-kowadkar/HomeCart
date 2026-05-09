# Product Requirements Document: Cartographer

**Version:** 1.0  
**Status:** Finalized (Design Phase)  
**Target Launch:** MVP

---

## 1. Executive Summary
Cartographer is a mobile-first AI companion designed to help immigrants and international newcomers navigate American grocery stores with confidence. It bridges the gap between unfamiliar products and the foods, flavors, and habits of their home countries, using real-time computer vision and cultural intelligence.

## 2. Problem Statement
For newcomers to the US, the grocery store is a site of daily stress. Thousands of unfamiliar brands, complex labels, and different cultural defaults make "simple" shopping tasks overwhelming. There is no existing "orientation layer" that translates US retail reality into global cultural context.

## 3. Goals & Success Metrics
### Goals
- Empower newcomers to shop independently from day one.
- Reduce "shopping errors" (buying the wrong ingredient for a specific dish).
- Minimize overspending by identifying high-quality US generic substitutes for expensive imports.

### Success Metrics
- **Activation Rate:** % of users who complete a scan or import a recipe in the first session.
- **Match Accuracy:** User-reported satisfaction with the "Match Score" recommendations.
- **List Export Rate:** % of generated lists exported to delivery services (Instacart).

## 4. User Personas
- **The Survivalist (Wei):** Arrived < 7 days ago. High anxiety, needs instant info via AR scanning.
- **The Orientation Mode (Priya):** International student. Needs to replicate home flavors on a budget using US substitutes.
- **The Settling Mode (Lucas):** Quality-conscious expat. Needs to decode US labels against European standards.

## 5. Functional Requirements (MVP)

### 5.1 Onboarding & Auth
- **Profile First:** Mandatory selection of home country (National Level) and language.
- **Social Auth:** One-tap login via Google/Apple/Facebook.

### 5.2 The Unified Feed (Home)
- **Primary View:** A dynamic feed containing a Global Search bar, active Smart List preview, and the hero "Magic Lens" button.
- **Closest to Home Search:** Search ingredients in home language/English; returns US equivalents with a **Match Score (%)** and AI cooking tips.

### 5.3 The Magic Lens (Store Mode)
- **AR Overlay:** Real-time computer vision points out "Match Scores" and "Quick Tips" directly over products in the camera view.
- **Quality Decoder:** Specifically flags additives or processing levels that differ from the user's home country standards.

### 5.4 Smart Grocery Lists (Planner)
- **Recipe Importer:** Users enter a dish name; AI builds a list of US ingredients/brands optimized for either "Value" or "Quality."
- **Store Persona Map:** Map view categorizing stores by "Vibe" (e.g., "The Essentials Warehouse" for Walmart, "The Quality Standard" for Whole Foods).

## 6. Technical Requirements
- **Performance:** AR scanning/recognition latency must be <1 second.
- **Cloud-Based AI:** Leveraging Vision-Language Models (VLMs) for real-time cultural translation.
- **Connectivity:** Requires active data/Wi-Fi for AI features.

## 7. User Experience & Design
- **Visual-First:** Minimal text, icon-led signals for accessibility.
- **One-Handed Operation:** Thumb-driven navigation for ease of use in-store.
- **Discreet HUD:** Minimalist camera interface to reduce social anxiety while shopping.

## 8. Non-Goals (Out of Scope for MVP)
- In-app payments or checkout.
- Weekly recipe generation (only list mapping).
- Social networking or community features.
- Monetization (Scale first approach).

---
## 9. Decision Log Summary
*Detailed history available in [decision_log.md](./decision_log.md)*
- **Strategy:** Magic Lens AI-First.
- **Auth:** Social-only.
- **Personalization:** National-level anchoring.
- **List Building:** Recipe-led automation.
