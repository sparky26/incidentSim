import React, { useEffect, useMemo, useState } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { getEvidenceProfile } from '../../data/evidenceCatalog';
import { aggregateIncidentPhaseMetrics, aggregateSimulationResults, aggregateSimulationResultsBySegment, type SignalMetric } from '../../utils/analytics';

const ResultsPanel = () => {
    const { results, setResults, simulationConfig } = useScenarioStore();
    const evidenceProfileId = results?.[0]?.evidenceProfileId ?? simulationConfig.evidenceProfileId;
    const evidenceProfile = getEvidenceProfile(evidenceProfileId);
    const signalMetricLabels: Record<SignalMetric, string> = {
        latency: 'Latency',
        error_rate: 'Error Rate',
        saturation: 'Saturation',
        unknown: 'Unknown'
    };

    const stats = useMemo(() => {
        if (!results || results.length === 0) return null;
        return aggregateSimulationResults(results);
    }, [results]);

    const phaseStats = useMemo(() => {
        if (!results || results.length === 0) return null;
        return aggregateIncidentPhaseMetrics(results);
    }, [results]);

    const segmentedStats = useMemo(() => {
        if (!results || results.length === 0) return null;
        return aggregateSimulationResultsBySegment(results);
    }, [results]);

    const availableProfiles = useMemo(() => {
        if (!segmentedStats) return [];
        return Array.from(new Set(segmentedStats.map(segment => segment.evidenceProfileId)));
    }, [segmentedStats]);

    const availableMetrics = useMemo(() => {
        if (!segmentedStats) return [];
        return Array.from(new Set(segmentedStats.map(segment => segment.signalMetric)));
    }, [segmentedStats]);

    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [selectedMetrics, setSelectedMetrics] = useState<SignalMetric[]>([]);

    useEffect(() => {
        setSelectedProfiles(availableProfiles);
    }, [availableProfiles]);

    useEffect(() => {
        setSelectedMetrics(availableMetrics);
    }, [availableMetrics]);

    const filteredSegments = useMemo(() => {
        if (!segmentedStats) return [];
        return segmentedStats.filter(segment =>
            selectedProfiles.includes(segment.evidenceProfileId)
            && selectedMetrics.includes(segment.signalMetric)
        );
    }, [segmentedStats, selectedProfiles, selectedMetrics]);

    const segmentedChartData = useMemo(() => {
        const grouped = new Map<string, { profileId: string; profileLabel: string } & Record<string, number>>();
        filteredSegments.forEach(segment => {
            const profileId = segment.evidenceProfileId;
            const profileLabel = getEvidenceProfile(profileId)?.name
                ?? (profileId === 'unspecified' ? 'Unspecified' : profileId);
            const existing = grouped.get(profileId) ?? { profileId, profileLabel };
            existing[segment.signalMetric] = Math.round(segment.stats.avgMTTR);
            grouped.set(profileId, existing);
        });
        return Array.from(grouped.values());
    }, [filteredSegments]);

    if (!results || !stats) return null;

    const orderedMetrics = ['latency', 'error_rate', 'saturation', 'unknown'] as const;
    const metricsToDisplay = orderedMetrics.filter(metric => selectedMetrics.includes(metric));

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

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-sm text-slate-600 font-medium">Avg customer impact minutes</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {Math.round(stats.avgCustomerImpactMinutes)}m
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-sm text-slate-600 font-medium">Avg incidents per run</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {stats.avgIncidentCount.toFixed(1)}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-sm text-slate-600 font-medium">Avg resolved incidents</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {stats.avgResolvedCount.toFixed(1)}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-sm text-slate-600 font-medium">MTTR p95 + std dev + CI</div>
                            <div className="text-lg font-bold text-slate-900">
                                {Math.round(stats.p95)}m p95 · {stats.mttrStdDev.toFixed(1)}m σ
                            </div>
                            <div className="text-xs text-slate-500">
                                {stats.mttrCi
                                    ? `95% CI ±${stats.mttrCi.margin.toFixed(1)}m (${Math.round(stats.mttrCi.lower)}-${Math.round(stats.mttrCi.upper)}m)`
                                    : '95% CI unavailable (insufficient samples)'}
                            </div>
                        </div>
                    </div>

                    {/* Segmented Summary */}
                    <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-700">Segmented MTTR (Avg)</h3>
                            <p className="text-xs text-gray-500">
                                Compare mean recovery times by evidence profile and signal metric.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-6 text-xs text-gray-600">
                            <div className="space-y-2">
                                <div className="font-semibold text-gray-700">Evidence profiles</div>
                                <div className="flex flex-wrap gap-2">
                                    {availableProfiles.map(profileId => {
                                        const label = getEvidenceProfile(profileId)?.name
                                            ?? (profileId === 'unspecified' ? 'Unspecified' : profileId);
                                        const checked = selectedProfiles.includes(profileId);
                                        return (
                                            <label
                                                key={profileId}
                                                className={`flex items-center gap-2 rounded border px-2 py-1 ${checked ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="accent-blue-600"
                                                    checked={checked}
                                                    onChange={() => {
                                                        setSelectedProfiles(prev =>
                                                            prev.includes(profileId)
                                                                ? prev.filter(value => value !== profileId)
                                                                : [...prev, profileId]
                                                        );
                                                    }}
                                                />
                                                <span>{label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="font-semibold text-gray-700">Signal metrics</div>
                                <div className="flex flex-wrap gap-2">
                                    {orderedMetrics.filter(metric => availableMetrics.includes(metric)).map(metric => {
                                        const checked = selectedMetrics.includes(metric);
                                        return (
                                            <label
                                                key={metric}
                                                className={`flex items-center gap-2 rounded border px-2 py-1 ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="accent-emerald-600"
                                                    checked={checked}
                                                    onChange={() => {
                                                        setSelectedMetrics(prev =>
                                                            prev.includes(metric)
                                                                ? prev.filter(value => value !== metric)
                                                                : [...prev, metric]
                                                        );
                                                    }}
                                                />
                                                <span>{signalMetricLabels[metric]}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="h-64">
                            {segmentedChartData.length === 0 || metricsToDisplay.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                                    Select at least one segment to display the chart.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={segmentedChartData}>
                                        <XAxis dataKey="profileLabel" fontSize={11} stroke="#9CA3AF" />
                                        <YAxis fontSize={11} stroke="#9CA3AF" />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [`${value}m`, signalMetricLabels[name as SignalMetric] ?? name]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend formatter={(value: string) => signalMetricLabels[value as SignalMetric] ?? value} />
                                        {metricsToDisplay.map(metric => (
                                            <Bar
                                                key={metric}
                                                dataKey={metric}
                                                fill={metric === 'latency' ? '#38BDF8' : metric === 'error_rate' ? '#FB7185' : metric === 'saturation' ? '#34D399' : '#CBD5F5'}
                                                radius={[4, 4, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Histogram */}
                    <div className="h-64">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Duration Distribution (Minutes)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.histogram}>
                                <XAxis
                                    dataKey="bucket"
                                    type="number"
                                    fontSize={11}
                                    stroke="#9CA3AF"
                                    tickFormatter={(value: number) => `${Math.round(value)}m`}
                                />
                                <YAxis fontSize={11} stroke="#9CA3AF" />
                                <Tooltip
                                    formatter={(value: number) => [`${value}`, 'Count']}
                                    labelFormatter={(value: number) => `~${Math.round(value)}m`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                <ReferenceLine
                                    x={stats.avgMTTR}
                                    stroke="#0F172A"
                                    strokeDasharray="3 3"
                                    label={{ value: 'Mean', position: 'top', fill: '#0F172A', fontSize: 10 }}
                                />
                                <ReferenceLine
                                    x={stats.p90}
                                    stroke="#6366F1"
                                    strokeDasharray="4 4"
                                    label={{ value: 'P90', position: 'top', fill: '#6366F1', fontSize: 10 }}
                                />
                                <ReferenceLine
                                    x={stats.p95}
                                    stroke="#14B8A6"
                                    strokeDasharray="4 4"
                                    label={{ value: 'P95', position: 'top', fill: '#14B8A6', fontSize: 10 }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Incident Pipeline */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Incident Pipeline</h3>
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold">Phase</th>
                                        <th className="px-4 py-2 text-right font-semibold">Median</th>
                                        <th className="px-4 py-2 text-right font-semibold">P90</th>
                                        <th className="px-4 py-2 text-right font-semibold">Average</th>
                                        <th className="px-4 py-2 text-right font-semibold">Completion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {phaseStats && [
                                        { key: 'detect', label: 'Detect (Failure → Signal)' },
                                        { key: 'alert', label: 'Alert (Signal → Alert Fired)' },
                                        { key: 'page', label: 'Page (Alert → Ack)' },
                                        { key: 'response', label: 'Response (Action → Completed)' },
                                        { key: 'total', label: 'Total (Incident → Resolved)' }
                                    ].map(phase => {
                                        const phaseSummary = phaseStats.phases[phase.key as keyof typeof phaseStats.phases];
                                        const completion = phaseSummary.samples + phaseSummary.partialCount;
                                        return (
                                            <tr key={phase.key}>
                                                <td className="px-4 py-2 font-medium text-gray-800">{phase.label}</td>
                                                <td className="px-4 py-2 text-right">{Math.round(phaseSummary.median)}m</td>
                                                <td className="px-4 py-2 text-right">{Math.round(phaseSummary.p90)}m</td>
                                                <td className="px-4 py-2 text-right">{Math.round(phaseSummary.average)}m</td>
                                                <td className="px-4 py-2 text-right text-xs text-gray-500">
                                                    {completion > 0
                                                        ? `${Math.round(phaseSummary.completionRate)}% (${phaseSummary.samples}/${completion})`
                                                        : 'n/a'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Completion rates exclude partial sequences where required events were missing.
                        </p>
                    </div>

                    {/* Debug / Insights */}
                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800">
                        <strong>Insight:</strong>
                        {stats.mttrCi && stats.mttrCi.width > stats.avgMTTR * 0.4
                            ? ' High uncertainty detected. Confidence interval is wide relative to the mean.'
                            : stats.p90 > stats.avgMTTR * 1.5
                                ? ' High variance detected. Long-tail incidents significantly impact reliability.'
                                : ' Distribution is relatively tight. Response process is consistent.'}
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
