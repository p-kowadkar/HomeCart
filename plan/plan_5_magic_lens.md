# Implementation Plan 5: Magic Lens (AR/Vision Integration)

## Overview
The "Survival Mode" feature. Integrating the camera and real-time computer vision for in-store assistance.

## Tasks
1. **Camera HUD**
   - [ ] Build camera interface with minimalist HUD.
   - [ ] Implement object detection frame capture (local or cloud-triggered).

2. **Vision-AI Integration**
   - [ ] Connect to Vision API (e.g., Vertex AI Gemini with Multimodal input).
   - [ ] Pass user profile (Origin/Language) as context for every scan.

3. **AR Overlay UI**
   - [ ] Implement floating glassmorphism cards.
   - [ ] Anchoring logic for cards over detected products (using library like ViroReact or simple frame-based overlays).
   - [ ] Color-coded match signals (Green/Yellow/Red).
