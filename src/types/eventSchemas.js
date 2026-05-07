// Shared Zod schemas for event JSONB fields.
// Plain JS so both the Node.js backend (server/services/exploreService.js)
// and TypeScript frontend files can import this module.
import { z } from 'zod';

export const LayerSchema = z.object({
  text:            z.string(),
  best_action:     z.enum(['search', 'wait', 'stone', 'retreat', 'jade']),
  wrong_alert_add: z.number().optional(),
  blur_text:       z.string().optional(),
}).passthrough();

export const ProgressionSchema = z.record(z.string(), LayerSchema);

export const OutcomeWeightsSchema = z.object({
  worst_result: z.string(),
}).catchall(z.number());

export const ActionModifiersSchema = z.record(
  z.string(),
  z.record(z.string(), z.number()),
);

export const EventSchema = z.object({
  id:               z.string().uuid(),
  tier:             z.number().int().min(1).max(5),
  attribute:        z.enum(['fire', 'water', 'wood', 'metal', 'earth']),
  hidden_level:     z.number().int(),
  total_layers:     z.number().int().min(1).max(6),
  progression:      ProgressionSchema,
  outcome_weights:  OutcomeWeightsSchema,
  action_modifiers: ActionModifiersSchema,
  base_rare_rate:   z.number(),
  entity_data:      z.record(z.string(), z.unknown()).optional().default({}),
}).passthrough();

export function parseEvent(row) {
  const result = EventSchema.safeParse(row);
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`事件資料格式錯誤 (id=${row?.id ?? '?'}): ${issues}`);
  }
  return result.data;
}
