export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isLoading?: boolean;
  groundingMetadata?: GroundingMetadata;
  // Base64 string for user uploaded images
  attachment?: string; 
  // Base64 string for model generated images
  generatedImage?: string;
}

export interface GroundingMetadata {
  groundingChunks?: {
    web?: {
      uri?: string;
      title?: string;
    };
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
}