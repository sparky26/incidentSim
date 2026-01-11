// Simple LCG or connection to a library like seedrandom if we were using it.
// For now, a custom LCG is sufficient for v1 deterministic simulation.

export class Random {
    private _seed: number;

    constructor(seed: number) {
        this._seed = seed;
    }

    // Linear Congruential Generator
    // using constants from Numerical Recipes
    public next(): number {
        this._seed = (this._seed * 1664525 + 1013904223) % 4294967296;
        return this._seed / 4294967296;
    }

    public nextRange(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    // Normal distribution using Box-Muller transform
    public nextGaussian(mean: number = 0, stdDev: number = 1): number {
        let u = 0, v = 0;
        while (u === 0) u = this.next(); // Converting [0,1) to (0,1)
        while (v === 0) v = this.next();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return num * stdDev + mean;
    }

    public nextLogNormal(mean: number, stdDev: number): number {
        // Log-normal logic: exp(Normal(mu, sigma))
        // Note: mean/stdDev params here are for the underlying normal distribution? 
        // Usually user inputs "Mean duration" and "StdDev" of the result, not the underlying log space.
        // For v1 simplicity, we assume the inputs are for the approximate output.
        // Actually, properly: 
        // mu = ln(mean^2 / sqrt(mean^2 + var))
        // sigma^2 = ln(1 + var / mean^2)

        // Let's stick to Gaussian for simplicity unless specifically asked for LogNormal props.
        // But Incidents are usually LogNormal. 
        // We'll implement a helper that takes target Mean/StdDev and converts to LogNormal params.

        const var_ = stdDev * stdDev;
        const mu = Math.log((mean * mean) / Math.sqrt(var_ + mean * mean));
        const sigma = Math.sqrt(Math.log(1 + (var_ / (mean * mean))));

        return Math.exp(this.nextGaussian(mu, sigma));
    }

    public boolean(probability: number): boolean {
        return this.next() < probability;
    }
}
