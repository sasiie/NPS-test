export type QuestionType = "scale" | "text";

export type SurveyQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  required?: boolean;
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
  submittedAt: string;
  answers: SurveyAnswers;
};
