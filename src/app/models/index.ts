export interface DiscoveryMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  questions: DiscoveryQuestion[];
}

export interface DiscoveryQuestion {
  id: string;
  text: string;
  options: string[];
  allowCustom: boolean;
}

export interface DiscoveryIntent {
  modeId: string;
  modeTitle: string;
  answers: Record<string, string>;
}

export interface AiSearchParams {
  playlistTitle: string;
  playlistDescription: string;
  genres: string[];
  mood: string;
  tempo: string;
  artistPreferences: string[];
  excludedGenres: string[];
  searchKeywords: string[];
  recommendationExplanation: string;
  refinementSuggestions: string[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  genre: string;
  previewUrl: string | null;
  spotifyUrl: string;
  isLocal?: boolean;
}

export interface GeneratedPlaylist {
  title: string;
  description: string;
  tracks: Track[];
  aiParams: AiSearchParams;
  createdAt: Date;
  explanation: string;
}

export interface FeedbackType {
  type: 'more_like_this' | 'less_like_this' | 'different_artists' | 'different_genres' | 'refresh';
  label: string;
  icon: string;
  description: string;
}

export interface RecentlyPlayedItem {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  type: 'album' | 'playlist' | 'artist';
}

export interface RecommendedItem {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  reason: string;
}
