# Studio Domain Switcher & P-Video Engine Integration Plan

Complete domain isolation separating Architectural Real Estate from Character & Portrait Studio, paired with the integration of the ultra-fast `p-video` generation engine (`P-VID`).

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural real estate features and character portrait features will be strictly decoupled into independent domain contexts so that real estate terminology, perspective lines, and property workflows never bleed into character portrait sets, and vice versa.

- **Confirmed Decision 1**: **Explicit Studio Switcher**: Implement a top-level domain switcher offering `Architectural & Real Estate`, `Character & Portrait Studio`, and `Universal Photography`. Switching domains instantly switches the Director copilot persona, system prompts, camera choreography presets, and batch terminology.
- **Confirmed Decision 2**: **`P_VIDEO_API_KEY` Authentication**: The server-side video route (`/api/video/generate`) will read `P_VIDEO_API_KEY` from environment variables, formatting standard video payloads (base64 image, prompt, motion parameters, aspect ratio).
- **Confirmed Decision 3**: **`P-VID` in Model Selector**: Elevated as a first-class engine choice in the video motion deck: `P-VID` | `OMNI` | `H3` | `SEED` | `WAN3`, functioning as the ultra-fast, budget-optimized video engine across all domains.

---

## 1. Overview & Core Concept

### What It Does
- **Studio Domain Isolation**: Artists can select between three specialized studio modes:
  1. **Architectural & Real Estate**: Ezra Stoller / Roger Deakins architectural director persona, perspective correction, facade materiality, dynamic range balancing, drone/pedestal camera trajectories, and property address batch management.
  2. **Character & Portrait Studio**: Richard Avedon / Annie Leibovitz portrait director persona, 85mm/135mm optics, Rembrandt/butterfly lighting, skin tone fidelity, hair micro-texture, portrait push/head-turn motion choreography, and prominent `/c Identity Anchor` multi-angle consistency.
  3. **Universal Photography**: Neutral commercial photography studio for products, automotive, street, nature, and general enhancement without domain bias.
- **`p-video` Engine Integration (`P-VID`)**: Adds direct integration for the `p-video` endpoint, enabling lightning-fast, high-volume video renders directly from stills with zero blocking in the dashboard queue.

### Target Audience & Persona
Commercial photographers, portrait artists, and architectural visualizers who require pristine prompt purity—ensuring human portraits never inherit concrete reflection prompts and architectural plates never inherit facial retouching rules.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Switching Studio Domains**:
   - In the left control panel, above the workflow and media targets, a segmented **Studio Domain** selector displays:
     - `ARCHITECTURAL` · `PORTRAIT` · `UNIVERSAL`
   - Selecting `PORTRAIT`:
     - System prompt automatically updates to portrait-grade fidelity (natural skin textures, authentic eye catchlights, clean hair separation).
     - Camera choreography badges update to: `PORTRAIT PUSH`, `HEAD TURN 15°`, `BREATHING DRIFT`, `ORBIT TORSO`.
     - Creative Director copilot switches to portrait cinematography (focal lengths: 85mm f/1.4, 135mm f/2.0; lighting: Rembrandt, Paramount/Butterfly, subtle hair rim light).
     - Gallery title banner switches from "Property Address" to "Session / Subject Name".
   - Selecting `ARCHITECTURAL`:
     - System prompt, Director copilot, and motion badges seamlessly return to tilt-shift lenses, twilight blue hour, and structural drone arcs.

2. **Selecting `P-VID` Video Engine**:
   - In Video Mode, the engine selector bar displays 5 crisp buttons:
     - `P-VID` (Ultra-Fast Turbo) · `OMNI` · `H3` · `SEED` · `WAN3`
   - Active selection displays an amber highlight with latency and cost indicators (`Turbo Speed · Ultra-Low Cost`).
   - Clicking "Generate Video" passes the job through the server-side proxy route using `process.env.P_VIDEO_API_KEY`.

### Visual Identity & Theme
- **Theme**: Monochromatic jet black (`#050505` to `#09090b`) with razor-sharp borders (`border-white/10`) and warm amber/orange highlights (`bg-amber-400`, `text-amber-400`).
- **Domain Indicators**: Quiet, unboxed indicator text with middle-dot (`·`) separators (e.g. `Portrait Studio · 85mm Prime · P-VID Turbo`).
- **Anti-Slop Discipline**: Zero nested pill containers or fake status scoreboards.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Domain-Specific Motion Choreography & System Instructions
- **Chosen Approach**: Maintain dedicated prompt dictionaries and choreography presets for each domain in `lib/gemini.ts`, dynamically selected by `studioDomain`.
- **Why**: Completely eliminates the risk of architectural prompt snippets ("Preserve architectural verticals and concrete caustics") leaking into portrait generations.
- **Alternatives Considered**: A single generic prompt dictionary. Rejected because generic prompts produce bland AI output that satisfies neither architectural nor portrait standards.

### Decision 2: Server-Side `P-VID` Proxy Route
- **Chosen Approach**: Route `p-video` requests through `/api/video/generate` using `process.env.P_VIDEO_API_KEY` (with graceful fallback to Omni 1.1 if unavailable).
- **Why**: Keeps API keys strictly server-side, conforms to security requirements, and handles network timeouts or base64 data URL conversion cleanly.
- **Alternatives Considered**: Direct client-side calls. Rejected because exposing API keys in client code breaches security guidelines.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BATCHLAB STUDIO                               │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Studio Domain Switcher: [ARCHITECTURAL]  [PORTRAIT]  [UNIVERSAL]│   │
│   └────────────────────────────────┬────────────────────────────────┘   │
│                                    │                                    │
│                 ┌──────────────────┴──────────────────┐                 │
│                 ▼                                     ▼                 │
│     Architectural Context                  Portrait Context             │
│   • Ezra Stoller Director                • Avedon Portrait Director     │
│   • Orbit / Dolly / Pedestal             • Push / Head Turn / Drift     │
│   • Property Address & Facades           • Subject /c Identity Anchor   │
│   • 24mm Tilt-Shift / Dusk 3200K         • 85mm f/1.4 / Rembrandt Rim   │
│                 │                                     │                 │
│                 └──────────────────┬──────────────────┘                 │
│                                    ▼                                    │
│              Video Engine Selector: [P-VID] [OMNI] [H3] [SEED] [WAN3]   │
│                                    │                                    │
│                                    ▼                                    │
│                     Next.js API Route: /api/video/generate              │
│                 ┌──────────────────┴──────────────────┐                 │
│                 ▼                                     ▼                 │
│        process.env.P_VIDEO_API_KEY          process.env.GEMINI_API_KEY  │
│        (P-Video Turbo Engine)               (Omni 1.1 Flash & SpicyAPI) │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Updates
- **`StudioDomain`**: `'arch' | 'portrait' | 'universal'` added to `useREBE` state.
- **`VideoModel`**: Updated to `'pvid' | 'omni' | 'h3' | 'seed' | 'wan3'`.
- **`PORTRAIT_CHOREOGRAPHIES`**:
  - `portrait_push`: Slow push-in towards eyes (`PORTRAIT PUSH`).
  - `head_turn`: Subtle 15° head rotation with natural gaze lock (`HEAD TURN 15°`).
  - `breathing_drift`: Subtle breathing and ambient hair sway (`BREATHING DRIFT`).
  - `orbit_torso`: Smooth semi-circle orbit around subject shoulders (`ORBIT TORSO`).
- **`ARCHITECTURAL_CHOREOGRAPHIES`**:
  - `drone_orbit` (`ORBIT 360`), `dolly_in` (`DOLLY IN`), `pedestal_up` (`PEDESTAL UP`), `atmospheric_drift` (`ATMOSPHERIC DRIFT`).
