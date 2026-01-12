import { BlockBehavior } from '../SimulationEngine';
import { ServiceBehavior, DependencyBehavior, TrafficBehavior, VendorBehavior, DeploymentBehavior } from './SystemBlocks';
import { SignalBehavior, AlertRuleBehavior, EscalationBehavior, OnCallBehavior } from './DetectionBlocks';
import { ResponderBehavior, CommanderBehavior, CommChannelBehavior } from './HumanBlocks';
import { ActionBehavior } from './MitigationBlocks';
import { RunbookBehavior } from './ProcessBlocks';

export const ALL_BEHAVIORS: Record<string, BlockBehavior> = {
    'Service': ServiceBehavior,
    'Dependency': DependencyBehavior,
    'Vendor': VendorBehavior,
    'Traffic': TrafficBehavior,
    'Deployment': DeploymentBehavior,
    'Signal': SignalBehavior,
    'AlertRule': AlertRuleBehavior,
    'Escalation': EscalationBehavior,
    'OnCall': OnCallBehavior,
    'Responder': ResponderBehavior,
    'Commander': CommanderBehavior,
    'CommChannel': CommChannelBehavior,
    'Runbook': RunbookBehavior,
    'Action': ActionBehavior
};
