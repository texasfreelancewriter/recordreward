// Interview system types

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Question {
  id: string;
  interviewId: string;
  questionText: string;
  category: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  clip?: Clip | null;
}

export interface Clip {
  id: string;
  interviewId: string;
  questionId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
}

export interface Interview {
  id: string;
  title: string;
  userId: string;
  status: 'pending' | 'recorded' | 'published' | 'pending_approval' | 'dismissed';
  starRating?: number | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  questions?: Question[];
  clips?: Clip[];
}

export interface CreateInterviewInput {
  userId: string;
  title: string;
}

export interface SaveClipInput {
  questionId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}
