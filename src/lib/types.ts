export interface Session {
  id: string;
  presenter_id: string;
  title: string;
  speaker_name: string;
  session_code: string;
  slide_url: string | null;
  is_active: boolean;
  created_at: string;
  ended_at: string | null;
}

export interface Message {
  id: string;
  session_id: string;
  author_name: string;
  content: string;
  is_question: boolean;
  created_at: string;
}

export interface Reaction {
  id: string;
  session_id: string;
  emoji: string;
  count: number;
}

export interface Poll {
  id: string;
  session_id: string;
  question: string;
  is_active: boolean;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
  display_order: number;
  color: string;
}

export interface PollVote {
  id: string;
  poll_option_id: string;
  voter_id: string;
  created_at: string;
}

export interface QuestionUpvote {
  id: string;
  message_id: string;
  voter_id: string;
  created_at: string;
}

export interface EmailCapture {
  id: string;
  session_id: string;
  email: string;
  captured_at: string;
}

export interface Rating {
  id: string;
  session_id: string;
  rating: number;
  voter_id: string;
  created_at: string;
}

// Helper type for messages with their upvote count (used in Q&A view)
export interface QuestionWithVotes extends Message {
  upvote_count: number;
  has_voted: boolean;
}

// Helper type for poll with its options
export interface PollWithOptions extends Poll {
  options: PollOption[];
}

// Database type definitions for Supabase client
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at' | 'slide_url'> & { id?: string; created_at?: string; slide_url?: string | null };
        Update: Partial<Session>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Message>;
        Relationships: [];
      };
      reactions: {
        Row: Reaction;
        Insert: Omit<Reaction, 'id'> & { id?: string };
        Update: Partial<Reaction>;
        Relationships: [];
      };
      polls: {
        Row: Poll;
        Insert: Omit<Poll, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Poll>;
        Relationships: [];
      };
      poll_options: {
        Row: PollOption;
        Insert: Omit<PollOption, 'id'> & { id?: string };
        Update: Partial<PollOption>;
        Relationships: [];
      };
      poll_votes: {
        Row: PollVote;
        Insert: Omit<PollVote, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<PollVote>;
        Relationships: [];
      };
      question_upvotes: {
        Row: QuestionUpvote;
        Insert: Omit<QuestionUpvote, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<QuestionUpvote>;
        Relationships: [];
      };
      email_captures: {
        Row: EmailCapture;
        Insert: Omit<EmailCapture, 'id' | 'captured_at'> & { id?: string; captured_at?: string };
        Update: Partial<EmailCapture>;
        Relationships: [];
      };
      ratings: {
        Row: Rating;
        Insert: Omit<Rating, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Rating>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
