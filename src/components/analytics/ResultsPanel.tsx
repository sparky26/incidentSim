import React, { useMemo } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getEvidenceProfile } from '../../data/evidenceCatalog';

const ResultsPanel = () => {
    const { results, setResults, simulationConfig } = useScenarioStore();
    const evidenceProfileId = results?.[0]?.evidenceProfileId ?? simulationConfig.evidenceProfileId;
    const evidenceProfile = getEvidenceProfile(evidenceProfileId);

    const stats = useMemo(() => {
        if (!results || results.length === 0) return null;

        const successfulRuns = results.filter(r => r.success);
        const failedRuns = results.filter(r => !r.success); // Timed out
        const resolvedTimes = successfulRuns.map(r => r.finalTime).sort((a, b) => a - b);

        const avgMTTR = resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length;
        const p90MTTR = resolvedTimes[Math.floor(resolvedTimes.length * 0.9)] || 0;
        const p95MTTR = resolvedTimes[Math.floor(resolvedTimes.length * 0.95)] || 0;

        // Histogram buckets (10 buckets)
        if (resolvedTimes.length === 0) {
            return { count: results.length, successRate: 0, avgMTTR: 0, p90: 0, histogram: [] };
        }

        const min = resolvedTimes[0];
        const max = resolvedTimes[resolvedTimes.length - 1];
        const range = max - min || 10;
        const step = range / 10;

        const histogram = Array.from({ length: 10 }).map((_, i) => {
            const start = min + i * step;
            const end = start + step;
            const count = resolvedTimes.filter(t => t >= start && t < end).length;
            return {
                range: `${Math.round(start)}-${Math.round(end)}m`,
                count
            };
        });

        return {
            count: results.length,
            successRate: (successfulRuns.length / results.length) * 100,
            avgMTTR,
            p90: p90MTTR,
            histogram
        };
    }, [results]);

    if (!results || !stats) return null;

    return (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-[800px] max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Simulation Results</h2>
                        <p className="text-sm text-gray-500">Analysis of {stats.count} runs</p>
                        <p className="text-xs text-gray-500">
                            Evidence profile:{' '}
                            <span className="font-medium text-gray-700">
                                {evidenceProfile?.name ?? (evidenceProfileId ? evidenceProfileId : 'Unspecified')}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={() => setResults(null as any)} // Close
                        className="text-gray-400 hover:text-gray-600 font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Top Metrics */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 group relative">
                            <div className="text-sm text-blue-600 font-medium border-b border-blue-200 border-dashed inline-block mb-1 cursor-help">MTTR (Avg)</div>
                            <div className="text-2xl font-bold text-blue-900">{Math.round(stats.avgMTTR)}m</div>
                            <div className="absolute top-full mt-2 left-0 w-64 p-2 bg-white text-xs text-gray-600 shadow-xl rounded border border-gray-200 hidden group-hover:block z-50">
                                <strong>Mean Time To Recovery:</strong> The average time it takes to fully resolve the incident after it starts.
                            </div>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 group relative">
                            <div className="text-sm text-indigo-600 font-medium border-b border-indigo-200 border-dashed inline-block mb-1 cursor-help">MTTR (P90)</div>
                            <div className="text-2xl font-bold text-indigo-900">{Math.round(stats.p90)}m</div>
                            <div className="absolute top-full mt-2 left-0 w-64 p-2 bg-white text-xs text-gray-600 shadow-xl rounded border border-gray-200 hidden group-hover:block z-50">
                                <strong>90th Percentile:</strong> 90% of incidents were resolved within this time. Useful for understanding "worst case" scenarios.
                            </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                            <div className="text-sm text-green-600 font-medium">Success Rate</div>
                            <div className="text-2xl font-bold text-green-900">{Math.round(stats.successRate)}%</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="text-sm text-gray-600 font-medium">Samples</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
                        </div>
                    </div>

                    {/* Histogram */}
                    <div className="h-64">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Duration Distribution (Minutes)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.histogram}>
                                <XAxis dataKey="range" fontSize={11} stroke="#9CA3AF" />
                                <YAxis fontSize={11} stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Debug / Insights */}
                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800">
                        <strong>Insight:</strong>
                        {stats.p90 > stats.avgMTTR * 1.5
                            ? " High variance detected. Long-tail incidents significantly impact reliability."
                            : " Distribution is relatively tight. Response process is consistent."}
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                        onClick={() => setResults(null as any)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 font-medium text-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResultsPanel;
