export interface Episode {
  id: string;
  title: string;
  content: string;
  playbackLog?: { c: string; s: number; t: number; p: number }[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  labels?: string[];
}

export interface Novel {
  id: string;
  title: string;
  episodes: Episode[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  labels?: string[];
  goal?: number;
}

export type ViewState = 
  | { type: 'shelf' }
  | { type: 'episodes', novelId: string }
  | { type: 'editor', novelId: string, episodeId: string };

export type CanvasBgType = 'black' | 'gray' | 'white';

