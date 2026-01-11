# Reliability Twin (Incident Management Simulator)

Reliability Twin is a browser-based incident management simulator. It lets you model a service ecosystem as a directed graph of blocks (services, signals, responders, actions, etc.), run Monte Carlo-style simulations, and analyze outcomes like MTTR and success rate. The UI is built with React + React Flow for the visual editor, while the simulation engine is a discrete-event system implemented in TypeScript.

## What the app does

### Visual incident modeling
- **Drag-and-drop block library** for system, detection, human, process, and mitigation components.
- **Connection constraints** enforce valid relationships between block types (e.g., Service → Signal, AlertRule → OnCall).
- **Inspector panel** exposes block configuration fields with tooltips that explain each property.
- **Template scenarios** provide example graphs to get started quickly.

### Simulation and analytics
- Runs **100 randomized simulations** per scenario by default, varying the seed for Monte Carlo coverage.
- Produces per-run event logs and aggregates metrics like:
  - **Incident count**
  - **Resolved count**
  - **Customer impact (minutes)**
  - **MTTR (mean time to recovery)**
  - **Success rate**
- Visualizes results using a histogram and summary cards.

## How to run the app locally

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run lint
npm run preview
```

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

## Data flow at runtime

1. **User builds scenario** in the graph editor.
2. **App validates** the graph with `ScenarioValidator`.
3. **Simulation run** converts nodes/edges into engine blocks.
4. **Engine executes events** through block behaviors.
5. **Results are aggregated** into metrics and visualized in the results panel.

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

## Notes and extension points

- **Monte Carlo runs**: change `NUM_RUNS` in `src/App.tsx` to adjust simulation volume.
- **New block types**: add to `BlockType` and `BlockConfig`, implement behavior, and register in the UI and connection rules.
- **Metrics**: update `SimulationEngine` to emit more aggregates or export detailed event logs.

## Screenshots

To capture UI changes, run the app and take a screenshot (not required for this README-only change).
