export interface Notebook {
  id: string;
  name: string;
  description: string;
  archived?: boolean;
  created: string;
  updated: string;
  source_count: number;
  note_count: number;
}

export interface NotebookSource {
  id: string;
  title: string;
  full_text?: string;
  topics?: string[];
  created: string;
  updated: string;
  embedded?: boolean;
  embedded_chunks?: number;
  status?: string;
  command_id?: string;
  lesson_id?: number;
  course_id?: number;
  course_title?: string;
  lesson_title?: string;
  asset?: {
    file_path?: string | null;
    url?: string | null;
  } | null;
}

export interface PodcastEpisode {
  id: string;
  name: string;
  episode_profile?: string | { name?: string; id?: string };
  speaker_profile?: string | { name?: string; id?: string };
  audio_url?: string;
  transcript?: string;
  outline?: string;
  created?: string;
  job_status?: string;
  status?: string;
  lesson_id?: number;
  course_id?: number;
  lesson_title?: string;
  course_title?: string;
  duration_seconds?: number;
}

export interface EpisodeProfile {
  id: string;
  name: string;
  description: string;
  speaker_config: string;
  speaker_config_name: string;
  default_briefing?: string;
  num_segments?: number;
}

export interface SearchResult {
  id: string;
  parent_id?: string;
  relevance: number;
  title: string;
  content?: string;
}

export interface NotebookChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  isError?: boolean;
}

export interface NotebookStatus {
  isOnline: boolean;
  apiUrl: string;
  webUrl: string;
  modelName: string;
}
