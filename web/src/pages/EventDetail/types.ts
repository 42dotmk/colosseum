
export interface Problem {
  documentId: string;
  title: string;
  description: string;
  slug: string;
  difficulty?: string;
  points: number;
  isInteractive?: boolean;
  interactorSource?: string;
  checkerSource?: string;
  leaderboardVisibilityMode?: 'public_only_live' | 'full_live';
  testCases?: any[];
}

export interface SupportedLanguage {
  documentId: string;
  name: string;
}

export interface Event {
  title: string;
  description: string;
  start: string;
  end: string;
  problems?: Problem[];
  supportedLanguages?: SupportedLanguage[];
}

export interface SubmissionExecution {
  processed: boolean;
  passed?: boolean;
  stdout?: string;
  testCase?: {
    output?: string;
    hidden?: boolean;
    locked?: boolean;
  };
}

export interface ProblemSubmission {
  documentId: string;
  createdAt: string;
  problem?: {
    documentId: string;
    leaderboardVisibilityMode?: 'public_only_live' | 'full_live';
  };
  executions?: SubmissionExecution[];
}

export type ProblemStatus = 'not_tried' | 'zero' | 'partial' | 'full';

export interface LeaderboardProblem {
  documentId: string;
  title?: string;
  points: number;
  leaderboardVisibilityMode: 'public_only_live' | 'full_live';
}

export interface LeaderboardRow {
  rank: number;
  user: {
    documentId: string;
    username?: string;
    email?: string;
    displayName: string;
  };
  totalScore: number;
  solvedCount: number;
  totalTime: number;
}

export interface LeaderboardResponse {
  event: {
    documentId: string;
    title: string;
    start?: string;
    end?: string;
    eventStarted?: boolean;
    eventEnded: boolean;
  };
  totals: {
    maxPoints: number;
    scoredCap: number;
  };
  leaderboardAvailable?: boolean;
  problems: LeaderboardProblem[];
  leaderboard: LeaderboardRow[];
}

export interface RegistrationStatus {
  eventId: string;
  registrationMode: 'open' | 'invite_only';
  allowPostStartRegistration: boolean;
  registrationOpen: boolean;
  isEligible: boolean;
  isRegistered: boolean;
  canRegister: boolean;
}

export interface EventQuestion {
  documentId: string;
  question: string;
  answer: string;
  answeredAt?: string;
  answeredBy?: {
    documentId?: string;
    displayName?: string;
  };
}

