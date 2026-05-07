export type Element = 'fire' | 'water' | 'wood' | 'metal' | 'earth';

export interface Player {
  id: string;
  auth_id: string | null;
  name: string;
  gender: string;
  age: number;
  max_age: number;

  hp: number;       max_hp: number;
  sp: number;       max_sp: number;
  ep: number;       max_ep: number;
  mp: number;       max_mp: number;
  aura: number;     max_aura: number;
  body: number;     max_body: number;

  attack: number;
  defense: number;
  element: Element | null;
  realm_level: number;

  mind: number;
  god_sense: number;
  max_god_sense: number;

  silver: number;
  spirit_stones: number;

  karma_good: number;
  karma_evil: number;
  prestige: number;
  sha_qi: number;

  springs_claimed_today: number;
  springs_reset_date: string | null;

  sr_wood: number;
  sr_fire: number;
  sr_water: number;
  sr_metal: number;
  sr_earth: number;

  prof_general: number;
  prof_pill: number;
  prof_artifact: number;
  prof_talisman: number;
  prof_puppet: number;

  tutorial_completed: boolean;
  last_sync_time: string;
  last_meditate_time: string | null;
  last_scan_time: string | null;
  created_at: string;
}
