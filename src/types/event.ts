import type { Element } from './player';

export type { Element };

export type EventAttribute = Element;
export type EventPhase = 'inference' | 'interaction' | 'completed';
export type EventAction = 'search' | 'wait' | 'stone' | 'retreat' | 'jade';

export interface LayerInfo {
  layer: number;
  text: string;
  visible: boolean;
}

export interface EventScanResult {
  player_event_id: string;
  event_tier: number;
  event_attribute: EventAttribute;
  start_layer: number;
  total_layers: number;
  current_layer: number;
  alert_level: number;
  phase: EventPhase;
  layers: LayerInfo[];
  ep_remaining: number;
}

export interface EventActionResult {
  action_taken: EventAction;
  was_correct: boolean;
  alert_level: number;
  correct_count: number;
  total_visited: number;
  current_layer: number;
  phase: EventPhase;
  next_layer_text: string | null;
  message: string;
  result?: 'retreat';
}

export interface EventResolveResult {
  result: string;
  rare_triggered: boolean;
  stones_gained: number;
  message: string;
  phase: 'completed';
}

export interface JadeEventResult {
  jade_item_id: string;
  event_tier: number;
  event_attribute: EventAttribute;
  snapshot_layer: number;
  message: string;
}

export interface JadeItem {
  id: string;
  owner_id: string | null;
  event_id: string;
  event_tier: number;
  event_attribute: EventAttribute;
  snapshot_layer: number;
  seller_correct_count: number;
  seller_total_layers: number;
  player_note: string | null;
  listed_price: number | null;
  status: 'held' | 'listed' | 'sold' | 'expired';
  expires_at: string | null;
  created_at: string;
}
