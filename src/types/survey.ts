export type QuestionType = "scale" | "text" | "multiple-choice";

export type SurveyQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
};

export type SurveySection = {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
};

export type SurveyAnswers = Record<string, string>;

export type SurveyResponse = {
  id: string;
  created_at: string;
  roundId: string;
  submittedAt: string;
  answers: SurveyAnswers;
};
