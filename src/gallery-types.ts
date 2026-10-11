export type GalleryPhase = 'intro' | 'entry' | 'take' | 'stash' | 'handoff' | 'investigate' | 'result';
export type EntrySpot = 'window' | 'door' | 'terrace';
export type StashSpot = 'planter' | 'bench' | 'clock';
export type GallerySpot = EntrySpot | StashSpot | 'pedestal';
export interface GalleryProfile {
  fabric: 'coral' | 'mint' | 'violet';
  tread: 'dots' | 'zigzag' | 'bars';
  charm: 'moon' | 'star' | 'leaf';
}
export interface GalleryState {
  phase: GalleryPhase;
  entry: EntrySpot | null;
  stash: StashSpot | null;
  found: readonly string[];
  relic: number;
  profile?: GalleryProfile;
  activeSpot?: string | null;
}
export interface GalleryOptions { onContextLost?: () => void; }
