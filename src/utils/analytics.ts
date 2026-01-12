import type { SimulationRunResult } from '../types/simulation';

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

    const min = resolvedTimes[0];
    const max = resolvedTimes[resolvedTimes.length - 1];
    const range = max - min || 10;
    const step = range / 10;

    const histogram = Array.from({ length: 10 }).map((_, i) => {
        const start = min + i * step;
        const end = start + step;
        const count = resolvedTimes.filter(value => value >= start && value < end).length;
        return {
            bucket: start + step / 2,
            rangeLabel: `${Math.round(start)}-${Math.round(end)}m`,
            count
        };
    });

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
