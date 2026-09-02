export type SurveyRound = {
    id: string;
    name: string;
    activeCategory?: string;
    activeOpenQuestion?: string;
};

export const activeRound: SurveyRound = {
    id: "round-1",
    name: "medarbetarpuls september 2026",
};