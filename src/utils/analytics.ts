import type { SimulationRunResult } from '../types/simulation';

type IncidentPhase = 'detect' | 'alert' | 'page' | 'response' | 'total';

interface PhaseDurationSummary {
    average: number;
    median: number;
    p90: number;
    histogram: Array<{ bucket: number; rangeLabel: string; count: number }>;
    samples: number;
    completionRate: number;
    partialCount: number;
}

const T_CRITICAL_95: Record<number, number> = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.16,
    14: 2.145,
    15: 2.131,
    16: 2.12,
    17: 2.11,
    18: 2.101,
    19: 2.093,
    20: 2.086,
    21: 2.08,
    22: 2.074,
    23: 2.069,
    24: 2.064,
    25: 2.06,
    26: 2.056,
    27: 2.052,
    28: 2.048,
    29: 2.045,
    30: 2.042
};

const getTCritical95 = (sampleSize: number) => {
    const df = Math.max(sampleSize - 1, 1);
    return T_CRITICAL_95[df] ?? 1.96;
};

const average = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((total, value) => total + value, 0) / values.length;
};

const percentile = (values: number[], percentileValue: number) => {
    if (values.length === 0) return 0;
    const index = Math.min(values.length - 1, Math.floor((values.length - 1) * percentileValue));
    return values[index];
};

const standardDeviation = (values: number[]) => {
    if (values.length < 2) return 0;
    const mean = average(values);
    const variance =
        values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
};

const buildHistogram = (values: number[]) => {
    if (values.length === 0) {
        return [] as Array<{ bucket: number; rangeLabel: string; count: number }>;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min || 10;
    const step = range / 10;

    return Array.from({ length: 10 }).map((_, i) => {
        const start = min + i * step;
        const end = start + step;
        const count = sorted.filter(value => value >= start && value < end).length;
        return {
            bucket: start + step / 2,
            rangeLabel: `${Math.round(start)}-${Math.round(end)}m`,
            count
        };
    });
};

const computeIncidentPhaseDurations = (run: SimulationRunResult) => {
    const incidentEvents = new Map<string, typeof run.events>();
    run.events.forEach(event => {
        if (!event.incidentId) return;
        const existing = incidentEvents.get(event.incidentId);
        if (existing) {
            existing.push(event);
        } else {
            incidentEvents.set(event.incidentId, [event]);
        }
    });

    const phaseDurations: Record<IncidentPhase, number[]> = {
        detect: [],
        alert: [],
        page: [],
        response: [],
        total: []
    };
    const phaseTotals: Record<IncidentPhase, { started: number; completed: number }> = {
        detect: { started: 0, completed: 0 },
        alert: { started: 0, completed: 0 },
        page: { started: 0, completed: 0 },
        response: { started: 0, completed: 0 },
        total: { started: 0, completed: 0 }
    };

    incidentEvents.forEach(events => {
        const timestamps: Record<string, number | undefined> = {};
        [...events]
            .sort((a, b) => a.timestamp - b.timestamp)
            .forEach(event => {
                if (timestamps[event.type] === undefined) {
                    timestamps[event.type] = event.timestamp;
                }
            });

        const failureTime = timestamps.FAILURE_OCCURRED;
        const signalTime = timestamps.SIGNAL_DETECTED;
        if (failureTime !== undefined) {
            phaseTotals.detect.started += 1;
            if (signalTime !== undefined && signalTime >= failureTime) {
                phaseDurations.detect.push(signalTime - failureTime);
                phaseTotals.detect.completed += 1;
            }
        }

        const alertTime = timestamps.ALERT_FIRED;
        if (signalTime !== undefined) {
            phaseTotals.alert.started += 1;
            if (alertTime !== undefined && alertTime >= signalTime) {
                phaseDurations.alert.push(alertTime - signalTime);
                phaseTotals.alert.completed += 1;
            }
        }

        const pageSentTime = timestamps.PAGE_SENT;
        const pageAckTime = timestamps.PAGE_ACKNOWLEDGED;
        if (alertTime !== undefined) {
            phaseTotals.page.started += 1;
            if (
                pageSentTime !== undefined
                && pageAckTime !== undefined
                && pageSentTime >= alertTime
                && pageAckTime >= pageSentTime
            ) {
                phaseDurations.page.push(pageAckTime - alertTime);
                phaseTotals.page.completed += 1;
            }
        }

        const actionStartTime = timestamps.ACTION_STARTED;
        const actionCompleteTime = timestamps.ACTION_COMPLETED;
        if (actionStartTime !== undefined) {
            phaseTotals.response.started += 1;
            if (actionCompleteTime !== undefined && actionCompleteTime >= actionStartTime) {
                phaseDurations.response.push(actionCompleteTime - actionStartTime);
                phaseTotals.response.completed += 1;
            }
        }

        const incidentStartTime = timestamps.INCIDENT_STARTED;
        const incidentResolvedTime = timestamps.INCIDENT_RESOLVED;
        if (incidentStartTime !== undefined) {
            phaseTotals.total.started += 1;
            if (incidentResolvedTime !== undefined && incidentResolvedTime >= incidentStartTime) {
                phaseDurations.total.push(incidentResolvedTime - incidentStartTime);
                phaseTotals.total.completed += 1;
            }
        }
    });

    return { phaseDurations, phaseTotals };
};

export const aggregateIncidentPhaseMetrics = (results: SimulationRunResult[]) => {
    const aggregatedDurations: Record<IncidentPhase, number[]> = {
        detect: [],
        alert: [],
        page: [],
        response: [],
        total: []
    };
    const aggregatedTotals: Record<IncidentPhase, { started: number; completed: number }> = {
        detect: { started: 0, completed: 0 },
        alert: { started: 0, completed: 0 },
        page: { started: 0, completed: 0 },
        response: { started: 0, completed: 0 },
        total: { started: 0, completed: 0 }
    };

    results.forEach(run => {
        const { phaseDurations, phaseTotals } = computeIncidentPhaseDurations(run);
        (Object.keys(phaseDurations) as IncidentPhase[]).forEach(phase => {
            aggregatedDurations[phase].push(...phaseDurations[phase]);
            aggregatedTotals[phase].started += phaseTotals[phase].started;
            aggregatedTotals[phase].completed += phaseTotals[phase].completed;
        });
    });

    const phases = (Object.keys(aggregatedDurations) as IncidentPhase[]).reduce(
        (acc, phase) => {
            const values = [...aggregatedDurations[phase]].sort((a, b) => a - b);
            const samples = values.length;
            const started = aggregatedTotals[phase].started;
            const completed = aggregatedTotals[phase].completed;
            const completionRate = started > 0 ? (completed / started) * 100 : 0;
            acc[phase] = {
                average: average(values),
                median: percentile(values, 0.5),
                p90: percentile(values, 0.9),
                histogram: buildHistogram(values),
                samples,
                completionRate,
                partialCount: Math.max(0, started - completed)
            };
            return acc;
        },
        {} as Record<IncidentPhase, PhaseDurationSummary>
    );

    return { phases };
};

export const aggregateSimulationResults = (results: SimulationRunResult[]) => {
    const successfulRuns = results.filter(run => run.success);
    const failedRuns = results.filter(run => !run.success);
    const resolvedTimes = successfulRuns
        .map(run => run.metrics.mttr ?? run.finalTime)
        .filter(value => Number.isFinite(value))
        .sort((a, b) => a - b);

    if (resolvedTimes.length === 0) {
        return {
            count: results.length,
            successRate: 0,
            avgMTTR: 0,
            p90: 0,
            p95: 0,
            mttrStdDev: 0,
            mttrCi: null as null | { lower: number; upper: number; width: number; margin: number },
            mttrSampleSize: 0,
            avgCustomerImpactMinutes: average(results.map(run => run.metrics.customerImpactMinutes ?? 0)),
            avgIncidentCount: average(results.map(run => run.metrics.incidentCount ?? 0)),
            avgResolvedCount: average(results.map(run => run.metrics.resolvedCount ?? 0)),
            histogram: [] as Array<{ bucket: number; rangeLabel: string; count: number }>,
            failedRuns: failedRuns.length
        };
    }

    const avgMTTR = average(resolvedTimes);
    const p90MTTR = percentile(resolvedTimes, 0.9);
    const p95MTTR = percentile(resolvedTimes, 0.95);
    const mttrStdDev = standardDeviation(resolvedTimes);
    const mttrSampleSize = resolvedTimes.length;

    const mttrMargin =
        mttrSampleSize > 1
            ? getTCritical95(mttrSampleSize) * (mttrStdDev / Math.sqrt(mttrSampleSize))
            : 0;
    const mttrCi = mttrSampleSize > 1 ? {
        lower: Math.max(0, avgMTTR - mttrMargin),
        upper: avgMTTR + mttrMargin,
        width: mttrMargin * 2,
        margin: mttrMargin
    } : null;

    const histogram = buildHistogram(resolvedTimes);

    return {
        count: results.length,
        successRate: (successfulRuns.length / results.length) * 100,
        avgMTTR,
        p90: p90MTTR,
        p95: p95MTTR,
        mttrStdDev,
        mttrCi,
        mttrSampleSize,
        avgCustomerImpactMinutes: average(results.map(run => run.metrics.customerImpactMinutes ?? 0)),
        avgIncidentCount: average(results.map(run => run.metrics.incidentCount ?? 0)),
        avgResolvedCount: average(results.map(run => run.metrics.resolvedCount ?? 0)),
        histogram,
        failedRuns: failedRuns.length
    };
};
