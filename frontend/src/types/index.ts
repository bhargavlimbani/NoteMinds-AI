// Shared frontend types - mirror the backend response shapes.

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type SubjectColor = 'violet' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'orange' | 'pink' | 'indigo' | 'teal';

export interface SubjectSummary {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: SubjectColor;
  createdAt: string;
  unitCount: number;
  noteCount: number;
  quizCount: number;
  progress: number;
}

export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  order: number;
}

export interface Unit {
  id: string;
  name: string;
  description: string | null;
  order: number;
  completion: number;
  lastStudiedAt: string | null;
  noteCount: number;
  topics: Topic[];
}

export interface SubjectDetail {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: SubjectColor;
  createdAt: string;
  noteCount: number;
  quizCount: number;
  progress: number;
  units: Unit[];
}

export interface SubjectInput {
  name: string;
  code?: string | null;
  description?: string | null;
  color?: SubjectColor;
}

export interface UnitInput {
  name: string;
  description?: string | null;
  topics?: string[];
}

export interface NoteSummary {
  id: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'txt';
  fileSize: number;
  fileUrl: string | null;
  wordCount: number;
  createdAt: string;
  subject: { id: string; name: string; code: string | null; color: SubjectColor };
  unit: { id: string; name: string } | null;
  chunkCount: number;
  preview?: string;
}

export interface NoteDetail extends NoteSummary {
  content: string;
}

export interface NoteSearchResult {
  noteId: string;
  noteTitle: string;
  fileName: string;
  subject: { id: string; name: string };
  unit: { id: string; name: string } | null;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface NoteSearchResponse {
  query: string;
  totalNotes: number;
  matches: number;
  method?: 'full-text' | 'keyword';
  results: NoteSearchResult[];
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  ok: boolean;
  durationMs: number;
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  toolCalls: ToolCall[] | null;
  createdAt: string;
  pending?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: { role: 'USER' | 'ASSISTANT'; preview: string; createdAt: string } | null;
}

export interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface ChatResponse {
  conversation: { id: string; title: string };
  userMessage: Message;
  assistantMessage: Message;
  toolCalls: ToolCall[];
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'MCQ' | 'TRUE_FALSE';

export interface QuizQuestion {
  id: string;
  order: number;
  type: QuestionType;
  question: string;
  options: string[];
}

export interface Quiz {
  id: string;
  title: string;
  difficulty: Difficulty;
  numberOfQuestions: number;
  subject: { id: string; name: string; color: SubjectColor };
  unit: { id: string; name: string } | null;
  createdAt: string;
  attempts: number;
  questions: QuizQuestion[];
  basedOnNotes?: boolean;
  noteTitles?: string[];
  mcp?: { tool: string; transport: string; durationMs: number };
}

export interface QuizListItem {
  id: string;
  title: string;
  difficulty: Difficulty;
  numberOfQuestions: number;
  subject: { id: string; name: string; color: SubjectColor };
  unit: { id: string; name: string } | null;
  attempts: number;
  createdAt: string;
}

export interface GradedQuestion {
  questionId: string;
  order: number;
  type: QuestionType;
  question: string;
  options: string[];
  selected: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizResult {
  resultId: string;
  quizId: string;
  title: string;
  difficulty: Difficulty;
  subject: { id: string; name: string; color: SubjectColor };
  unit: { id: string; name: string } | null;
  score: number;
  total: number;
  percentage: number;
  timeTakenSec: number | null;
  createdAt: string;
  unitCompletion: number | null;
  questions: GradedQuestion[];
}

export interface QuizHistoryItem {
  id: string;
  quizId: string;
  title: string;
  difficulty: Difficulty;
  subject: { id: string; name: string; color: SubjectColor };
  unit: { id: string; name: string } | null;
  score: number;
  total: number;
  percentage: number;
  timeTakenSec: number | null;
  createdAt: string;
}

export interface UnitProgress {
  unitId: string;
  unitName: string;
  order: number;
  completion: number;
  lastStudiedAt: string | null;
  topics: { total: number; completed: number; completedTopics: string[]; incompleteTopics: string[] };
  quiz: { attempts: number; averagePercentage: number | null; lastPercentage: number | null };
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  code: string | null;
  color: SubjectColor;
  progress: number;
  quizAverage: number | null;
  units: UnitProgress[];
}

export interface ProgressTotals {
  subjects: number;
  units: number;
  completedUnits: number;
  topics: number;
  completedTopics: number;
  quizAttempts: number;
  averageQuizScore: number | null;
}

export interface ProgressOverview {
  overall: number;
  totals: ProgressTotals;
  subjects: SubjectProgress[];
}

export interface FocusArea {
  priority: number;
  subjectId: string;
  subjectName: string;
  subjectColor: SubjectColor;
  unitId: string;
  unitName: string;
  completion: number;
  quizAverage: number | null;
  quizAttempts: number;
  lastStudiedAt: string | null;
  pendingTopics: string[];
  reasons: string[];
  action: string;
  score: number;
}

export interface Recommendation {
  generatedBy: 'gemini' | 'rules';
  summary: string;
  focusAreas: FocusArea[];
  overall: number;
  totals: ProgressTotals;
  dataSource: 'mcp' | 'direct';
  mcpTool: { name: string; durationMs: number };
  generatedAt: string;
}

export interface Activity {
  id: string;
  type: 'NOTE_UPLOAD' | 'QUIZ_COMPLETED' | 'PROGRESS_UPDATED' | 'TOPIC_COMPLETED' | 'CHAT';
  title: string;
  subjectId: string | null;
  unitId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface Dashboard {
  user: User;
  stats: {
    totalSubjects: number;
    totalUnits: number;
    completedUnits: number;
    totalNotes: number;
    quizAttempts: number;
    averageQuizScore: number | null;
    overallProgress: number;
    totalTopics: number;
    completedTopics: number;
  };
  subjects: { id: string; name: string; code: string | null; color: SubjectColor; progress: number; quizAverage: number | null; unitCount: number }[];
  recommendedNext: FocusArea | null;
  focusAreas: FocusArea[];
  recentlyStudied: { subjectId: string; subjectName: string; subjectColor: SubjectColor; unitId: string; unitName: string; completion: number; lastStudiedAt: string | null }[];
  recentActivities: Activity[];
  recentQuizzes: QuizHistoryItem[];
  recentConversations: { id: string; title: string; updatedAt: string; preview: string | null }[];
  weeklyActivity: { date: string; label: string; total: number; quizzes: number; chats: number }[];
}

export interface SystemStatus {
  mcp: {
    connected: boolean;
    transport: 'stdio' | 'inmemory';
    server: { name: string; version: string } | null;
    tools: { name: string; description: string }[];
    error?: string;
  };
  ai: { configured: boolean; model: string };
  storage: { persistent: boolean; provider: string };
}
