export type SurveyQuestion = {
  id: string;
  text: string;
  type: "scale" | "text";
  required?: boolean;
};

export type SurveySection = {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
};