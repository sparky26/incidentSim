# Reliability Twin (Incident Management Simulator)

Reliability Twin is a browser-based incident management simulator. It lets you model a service ecosystem as a directed graph of blocks (services, signals, responders, actions, etc.), run Monte Carlo-style simulations, and analyze outcomes like MTTR and success rate. The UI is built with React + React Flow for the visual editor, while the simulation engine is a discrete-event system implemented in TypeScript.

## Table of contents

- [Key capabilities](#key-capabilities)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [How the simulator works](#how-the-simulator-works)
  - [Visual incident modeling](#visual-incident-modeling)
  - [Simulation and analytics](#simulation-and-analytics)
  - [Data flow at runtime](#data-flow-at-runtime)
- [Core architecture](#core-architecture)
- [Project structure](#project-structure)
- [Configuration and extension points](#configuration-and-extension-points)
- [Troubleshooting](#troubleshooting)

## Key capabilities

- **Drag-and-drop graph editor** for system, detection, human, process, and mitigation components.
- **Connection constraints** that enforce valid relationships between block types (e.g., Service → Signal, AlertRule → OnCall).
- **Inspector panel** with in-context tooltips for each block property and its impact on simulation behavior.
- **Template scenarios** for common incident patterns (dependency failures, alert storms, escalation chains).
- **Monte Carlo simulation** with seeded randomness for reproducibility and broad outcome coverage.
- **Analytics output** including incident counts, customer impact minutes, MTTR, and success rate.

## Quick start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ (or a compatible package manager)

### Install and run

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal (typically `http://localhost:5173`).

## Scripts

```bash
npm run dev       # Start the Vite dev server
npm run build     # Build for production
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
```

## How the simulator works

### Visual incident modeling

- **Block library** lets you place services, detection signals, alert rules, responders, and mitigations onto the canvas.
- **Connection rules** ensure you only link compatible block types, preventing invalid flow graphs.
- **Inspector panel** provides editable configs with tooltips sourced from `src/data/propertyDefinitions.ts`.
- **Template scenarios** help you bootstrap complex graphs quickly.

### Simulation and analytics

- Runs **100 randomized simulations** per scenario by default, varying the seed for Monte Carlo coverage.
- Produces per-run event logs and aggregates metrics like:
  - **Incident count**
  - **Resolved count**
  - **Customer impact (minutes)**
  - **MTTR (mean time to recovery)**
  - **Success rate**
- Visualizes results using histogram plots and summary cards.

### Data flow at runtime

1. **User builds a scenario** in the graph editor.
2. **Scenario validation** runs via `ScenarioValidator` before any simulation.
3. **Simulation run** converts nodes/edges into engine blocks.
4. **Engine executes events** through per-block behaviors.
5. **Results are aggregated** into metrics and visualized in the results panel.

## Core architecture

### 1) React UI (graph editor + inspector + results)

- `src/App.tsx`
  - Orchestrates the simulation run.
  - Converts React Flow nodes/edges into engine blocks.
  - Validates scenarios before running.
  - Executes 100 runs and stores results in state.
- `src/components/canvas/SimulationCanvas.tsx`
  - React Flow canvas with drag/drop handling.
  - Validates connections using `isConnectionAllowed`.
- `src/components/ui/Sidebar.tsx`
  - Block library categories and draggable block list.
- `src/components/ui/Inspector.tsx`
  - Shows editable properties for the selected block.
  - Tooltip help text comes from `src/data/propertyDefinitions.ts`.
- `src/components/analytics/ResultsPanel.tsx`
  - Renders summary metrics and a histogram with Recharts.

### 2) State management

- `src/store/scenarioStore.ts`
  - Uses Zustand to store graph nodes/edges, simulation config, and results.
  - Provides actions for editing nodes, connecting edges, loading templates, and updating configs.
  - Defines default configs for each block type.

### 3) Simulation engine (discrete-event)

- `src/engine/SimulationEngine.ts`
  - Core event loop with a priority queue.
  - Executes per-block behaviors based on event type.
  - Tracks incidents and aggregates summary metrics.
- `src/engine/core/PriorityQueue.ts`
  - Min-heap used to process events in timestamp order.
- `src/engine/core/Random.ts`
  - Deterministic RNG for reproducible simulations; supports uniform, Gaussian, and log-normal sampling.
- `src/engine/Validator.ts`
  - Validates block configs and ensures connections match allowed rules.

### 4) Block behaviors

Each block type has a behavior that reacts to simulation events.

**System blocks (`src/engine/behaviors/SystemBlocks.ts`)**
- **Service**: initiates incidents on failures, handles recovery, and propagates dependency effects.
- **Dependency**: propagates upstream failures depending on hard/soft configuration.
- **Traffic**: creates load spikes that can induce failures.
- **Vendor**: simulates outages and SLA-driven recovery.
- **Deployment**: periodically pushes deployments and can trigger incidents based on risk.

**Detection blocks (`src/engine/behaviors/DetectionBlocks.ts`)**
- **Signal**: converts failures or load into detected signals, with noise simulation.
- **AlertRule**: fires alerts on signals and schedules resets.
- **OnCall**: pages connected responders when alerts fire.
- **Escalation**: executes step-based paging escalation policies.

**Human blocks (`src/engine/behaviors/HumanBlocks.ts`)**
- **Responder**: acknowledges pages, accounts for shift length and handovers, and kicks off actions.
- **Commander** and **CommChannel**: placeholders for coordination/communication behavior.

**Mitigation blocks (`src/engine/behaviors/MitigationBlocks.ts`)**
- **Action**: executes mitigation work with duration and success probabilities; successful actions recover services.

### 5) Data model and configuration

- Block types and configs are defined in `src/types/blocks.ts`.
- Simulation events, run results, and configs are defined in `src/types/simulation.ts`.
- Connection rules between block types live in `src/utils/connectionRules.ts`.
- Example scenarios are stored in `src/data/templates.ts`.
<img width="1917" height="911" alt="r1" src="https://github.com/user-attachments/assets/c7f96a89-d4e0-407c-8187-0cb32567440a" />

## Project structure

```
src/
  App.tsx
  components/
    analytics/ResultsPanel.tsx
    canvas/SimulationCanvas.tsx
    nodes/BlockNode.tsx
    ui/Inspector.tsx
    ui/Sidebar.tsx
  data/
    propertyDefinitions.ts
    templates.ts
  engine/
    SimulationEngine.ts
    Validator.ts
    behaviors/
      DetectionBlocks.ts
      HumanBlocks.ts
      MitigationBlocks.ts
      SystemBlocks.ts
    core/
      PriorityQueue.ts
      Random.ts
  store/scenarioStore.ts
  types/
    blocks.ts
    simulation.ts
  utils/
    connectionRules.ts
```

## Configuration and extension points

- **Simulation volume**: change `NUM_RUNS` in `src/App.tsx` to adjust simulation count.
- **New block types**:
  1. Extend `BlockType` and `BlockConfig` in `src/types/blocks.ts`.
  2. Implement behavior in `src/engine/behaviors/*`.
  3. Register UI defaults in `src/store/scenarioStore.ts`.
  4. Add palette metadata in the sidebar and property definitions.
  5. Update connection rules in `src/utils/connectionRules.ts`.
- **Metrics**: update `src/engine/SimulationEngine.ts` to emit more aggregates or export detailed event logs.
- **Validation**: adjust `src/engine/Validator.ts` to enforce stricter scenario rules.

## Troubleshooting

- **Blank canvas or missing styles**: ensure `npm install` completed and the dev server is running.
- **Simulation fails to run**: check the validation errors surfaced by the UI; common issues are missing required connections.
- **Unexpected metrics**: verify block configs in the Inspector panel and confirm your intended probabilities/latencies.
- **Type errors during build**: run `npm run lint` and fix any reported issues in the affected file paths.
