import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import SimulationCanvas from './components/canvas/SimulationCanvas';
import Sidebar from './components/ui/Sidebar';
import Inspector from './components/ui/Inspector';
import OnboardingTour from './components/ui/OnboardingTour';
import { useScenarioStore } from './store/scenarioStore';
import { SimulationEngine } from './engine/SimulationEngine';
import { ALL_BEHAVIORS } from './engine/behaviors';
import type { Block } from './types/blocks';
import ResultsPanel from './components/analytics/ResultsPanel';
import { TEMPLATES } from './data/templates';
import { SimulationBatchRunner, type SimulationSweepDimension } from './utils/SimulationBatchRunner';
import { v4 as uuidv4 } from 'uuid';

import { ScenarioValidator } from './engine/Validator';

function App() {
  const {
    nodes,
    edges,
    simulationConfig,
    setResults,
    setSimulating,
    isSimulating,
    results,
    loadTemplate,
    addResultsHistory
  } = useScenarioStore();
  const [selectedSweepId, setSelectedSweepId] = useState<string>('signal-delay');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = sessionStorage.getItem('rt-onboarding-seen');
    if (!hasSeenOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, []);

  const sweepOptions = useMemo(() => ([
    {
      id: 'signal-delay',
      label: 'Signal detection delay mean',
      dimension: {
        label: 'Detection delay mean',
        blockType: 'Signal',
        configKey: 'detectionDelayMean',
        values: [0.5, 1, 2, 3, 4]
      } satisfies SimulationSweepDimension
    },
    {
      id: 'responder-fatigue',
      label: 'Responder fatigue sensitivity',
      dimension: {
        label: 'Responder fatigue sensitivity',
        blockType: 'Responder',
        configKey: 'fatigueSensitivity',
        values: [0.05, 0.1, 0.2, 0.3, 0.4]
      } satisfies SimulationSweepDimension
    }
  ]), []);

  const selectedSweep = sweepOptions.find(option => option.id === selectedSweepId) ?? sweepOptions[0];

  const buildScenario = useCallback(() => {
    const blocks: Block[] = nodes.map(n => ({
      id: n.id,
      type: n.type as any,
      position: n.position,
      config: n.data
    }));

    const connections = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'hard'
    }));

    return { blocks, connections };
  }, [nodes, edges]);

  const handleRun = useCallback(async () => {
    // 1. Convert Nodes/Edges to Engine format
    const { blocks, connections } = buildScenario();

    // 1.5 Validation (Ironman)
    const errors = ScenarioValidator.validate(blocks, connections);
    if (errors.length > 0) {
      alert("Validation Failed:\n" + errors.join("\n"));
      return;
    }

    setSimulating(true);

    // 2. Run Simulation (Async to not block UI if we add delay, but here it's sync JS)
    // For Monte Carlo, we loop N times.
    // Use setTimeout to allow UI to update state "Simulating..."
    setTimeout(() => {
      try {
        const engine = new SimulationEngine(ALL_BEHAVIORS);
        const NUM_RUNS = 100; // Default for v1
        const results = [];
        const evidenceProfileIds = blocks
          .map(block => (block.config as any)?.evidenceProfileId)
          .filter(Boolean);
        const uniqueEvidenceProfiles = Array.from(new Set(evidenceProfileIds));
        const evidenceProfileId = uniqueEvidenceProfiles.length === 1 ? uniqueEvidenceProfiles[0] : 'mixed';

        console.time('Simulation');
        for (let i = 0; i < NUM_RUNS; i++) {
          const runResult = engine.run(blocks, connections, {
            ...simulationConfig,
            evidenceProfileId,
            seed: simulationConfig.seed + i // Vary seed
          });
          results.push(runResult);
        }
        console.timeEnd('Simulation');

        setResults(results);
        addResultsHistory({
          id: uuidv4(),
          scenarioId: simulationConfig.scenarioId,
          seedRange: {
            start: simulationConfig.seed,
            end: simulationConfig.seed + NUM_RUNS - 1,
            count: NUM_RUNS
          },
          configSnapshot: { ...simulationConfig, evidenceProfileId },
          results,
          createdAt: Date.now()
        });
      } catch (e) {
        console.error(e);
        alert('Simulation Failed: ' + e);
      } finally {
        setSimulating(false);
      }
    }, 100);

  }, [addResultsHistory, buildScenario, setResults, setSimulating, simulationConfig]);

  const handleSweepRun = useCallback(() => {
    const { blocks, connections } = buildScenario();
    const errors = ScenarioValidator.validate(blocks, connections);
    if (errors.length > 0) {
      alert("Validation Failed:\n" + errors.join("\n"));
      return;
    }

    if (!selectedSweep) {
      return;
    }

    const hasTargetBlock = blocks.some(block => block.type === selectedSweep.dimension.blockType);
    if (!hasTargetBlock) {
      alert(`No ${selectedSweep.dimension.blockType} blocks found for sweep.`);
      return;
    }

    setSimulating(true);

    setTimeout(() => {
      try {
        const engine = new SimulationEngine(ALL_BEHAVIORS);
        const runner = new SimulationBatchRunner(engine);
        const RUNS_PER_VALUE = 60;
        const evidenceProfileIds = blocks
          .map(block => (block.config as any)?.evidenceProfileId)
          .filter(Boolean);
        const uniqueEvidenceProfiles = Array.from(new Set(evidenceProfileIds));
        const evidenceProfileId = uniqueEvidenceProfiles.length === 1 ? uniqueEvidenceProfiles[0] : 'mixed';

        const batchResults = runner.runSweep({
          blocks,
          connections,
          config: simulationConfig,
          runsPerValue: RUNS_PER_VALUE,
          seedStart: simulationConfig.seed,
          dimension: selectedSweep.dimension,
          evidenceProfileId
        });

        const historyEntries = batchResults.map(entry => ({
          id: uuidv4(),
          scenarioId: simulationConfig.scenarioId,
          seedRange: entry.seedRange,
          configSnapshot: entry.configSnapshot,
          parameter: entry.parameter,
          results: entry.results,
          createdAt: Date.now()
        }));

        addResultsHistory(historyEntries);
        setResults(batchResults[0]?.results ?? null);
      } catch (e) {
        console.error(e);
        alert('Sweep Failed: ' + e);
      } finally {
        setSimulating(false);
      }
    }, 100);
  }, [addResultsHistory, buildScenario, selectedSweep, setResults, setSimulating, simulationConfig]);

  const handleDismissOnboarding = useCallback(() => {
    sessionStorage.setItem('rt-onboarding-seen', 'true');
    setIsOnboardingOpen(false);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-sm"></div>
          <h1 className="text-lg font-bold tracking-tight">Reliability Twin <span className="text-xs font-normal text-gray-500 ml-2">v0.1</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
            <a
              href="/LEARNERS_GUIDE.md"
              target="_blank"
              className="text-xs text-green-600 font-bold hover:underline mb-1"
              title="Zero to Hero Guide"
            >
              🎓 Start Here: Beginner's Guide
            </a>
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              ▶ Live onboarding tour
            </button>
            <a
              href="/TUTORIAL.md"
              target="_blank"
              className="text-[10px] text-gray-500 hover:text-blue-600"
              title="Reference Manual"
            >
              Reference Manual
            </a>
          </div>
          <select
            className="text-xs border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500"
            onChange={(e) => {
              const t = TEMPLATES.find(t => t.name === e.target.value);
              if (t) loadTemplate(t.nodes, t.edges);
            }}
            defaultValue=""
          >
            <option value="" disabled>Load Template...</option>
            {TEMPLATES.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
          <div className="text-xs text-gray-500">
            {nodes.length} Blocks • {edges.length} Connections
          </div>
          <select
            className="text-xs border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedSweepId}
            onChange={(e) => setSelectedSweepId(e.target.value)}
          >
            {sweepOptions.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={handleSweepRun}
            disabled={isSimulating}
            className={`px-3 py-2 rounded text-xs font-semibold text-white transition-all
                    ${isSimulating ? 'bg-gray-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md transform active:scale-95'}
                `}
          >
            {isSimulating ? 'Running...' : 'Run Sweep'}
          </button>
          <button
            onClick={handleRun}
            disabled={isSimulating}
            className={`px-4 py-2 rounded text-sm font-bold text-white transition-all
                    ${isSimulating ? 'bg-gray-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-md transform active:scale-95'}
                `}
          >
            {isSimulating ? 'Running...' : 'Run Simulation'}
          </button>
        </div>
      </header>

      {/* Visual Editor */}
      <main className="flex-1 overflow-hidden flex">
        <ReactFlowProvider>
          <Sidebar />
          <div className="flex-1 relative bg-gray-100">
            <SimulationCanvas />
          </div>
          <Inspector />
        </ReactFlowProvider>
      </main>

      {/* Results View */}
      {results && <ResultsPanel />}
      <OnboardingTour isOpen={isOnboardingOpen} onClose={handleDismissOnboarding} />
    </div>
  );
}

export default App;
