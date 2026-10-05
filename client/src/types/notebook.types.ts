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
  created: string;
  updated: string;
  embedded?: boolean;
  embedded_chunks?: number;
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
