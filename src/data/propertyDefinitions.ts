export const PROPERTY_DESCRIPTIONS: Record<string, string> = {
    // System
    'baseFailureRate': 'Probability of failure per minute (0.0 - 1.0). e.g., 0.001 means ~0.1% chance failing each minute.',
    'recoveryRate': 'Probability of self-recovery per minute. Lower means it stays down longer without intervention.',
    'evidenceProfileId': 'Evidence profile that supplies defaults for this block.',
    'type': 'Hard dependencies fail the parent immediately. Soft dependencies degrade performance.',
    'impact': '0-1 factor of how much this dependency affects the parent (1 = full outage).',
    'outageProbability': 'Chance that the vendor API goes down in any given minute.',
    'slaResponseTime': 'Minutes it takes for the vendor to fix the issue according to SLA.',
    'baselineRequestRate': 'Normal requests per minute.',
    'spikeProbability': 'Probability of a traffic spike occurring.',
    'spikeMultiplier': 'Magnitude of the traffic spike (x times normal load).',

    // Deployment
    'risk': 'Probability that a deployment causes a failure (0-1).',
    'canary': 'If true, reduces impact radius of bad deployments.',
    'automated': 'If true, the process runs automatically (e.g. CI/CD or Auto-Remediation).',
    'frequencyMinutes': 'How often deployments occur.',

    // Detection
    'metric': 'The signal type being monitored (Latency vs Errors).',
    'detectionDelayMean': 'Average minutes to detect the failure.',
    'detectionDelayStdDev': 'Standard deviation of detection time (variability).',
    'signalToNoiseRatio': '0-1. Higher means fewer false positives. 1.0 = Perfect Signal.',
    'threshold': 'Value threshold to trigger the alert.',
    'durationMinutes': 'Time the threshold must be breached before alerting.',
    'scheduleId': 'Identifier for the on-call schedule (e.g., "primary", "backup").',
    'handoverProtocol': 'Quality of shift handovers. Weak = context loss.',

    // Human
    'baseResponseTimeMean': 'Average minutes to acknowledge/act without fatigue.',
    'baseResponseTimeStdDev': 'Standard deviation of the response-time distribution.',
    'fatigueSensitivity': 'How much response time degrades with fatigue (0-1).',
    'shiftLengthHours': 'Time before a required handover (risk of context loss).',
    'experienceLevel': 'Rating 1-10. Higher experience reduces errors.',
    'skillTags': 'Comedy-separated tags. Responder needs matching tags for effective mitigation.',
    'activationSeverity': 'Incident severity level required to wake up this commander.',
    'coordinationBonus': 'Reduction in team communication overhead provided by this commander.',
    'latency': 'Communication delay in minutes.',
    'contextLossProb': 'Probability of information being misunderstood or lost.',

    // Process (Runbook)
    'quality': '0-1 Score. High quality runbooks significantly reduce diagnosis time.',
    'isOutdated': 'If true, the runbook contains wrong info, causing confusion and delays.',
    'quality': '0-1 Score. High quality runbooks significantly reduce diagnosis time.',
    'isOutdated': 'If true, the runbook contains wrong info, causing confusion and delays.',
    // 'automated': 'Shared key',

    // Mitigation
    'requiredSkill': 'Skill tag required to perform this action.',
    'durationMean': 'Average time to complete the action.',
    'durationStdDev': 'Standard deviation of the action duration distribution.',
    'successProbability': 'Chance that the action actually fixes the problem.',
    'isRollback': 'If true, reverts the system to a previous stable state.',
};
