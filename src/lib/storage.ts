import type { SurveyResponse } from "@/types/survey";

const responses: SurveyResponse[] = [];
export function getResponses(): SurveyResponse[] {
    return responses;
}

export function saveResponse(response: SurveyResponse): void {
    responses.push(response);
}