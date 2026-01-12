import type { BlockType } from '../types/blocks';

const CONNECTION_RULES: Record<BlockType, BlockType[]> = {
  Service: ['Signal', 'Dependency'],
  Dependency: ['Service', 'Dependency'],
  Vendor: ['Service', 'Dependency'],
  Traffic: ['Service'],
  Deployment: ['Service'],
  Signal: ['AlertRule'],
  AlertRule: ['OnCall', 'Escalation'],
  OnCall: ['Responder', 'CommChannel'],
  Escalation: ['OnCall'],
  Responder: ['Action'],
  Commander: ['Responder'],
  CommChannel: ['Commander', 'Responder'],
  Runbook: ['AlertRule'],
  Action: ['Service'],
};

export const isConnectionAllowed = (
  sourceType: BlockType | undefined,
  targetType: BlockType | undefined
): boolean => {
  if (!sourceType || !targetType) return false;
  return CONNECTION_RULES[sourceType]?.includes(targetType) ?? false;
};
