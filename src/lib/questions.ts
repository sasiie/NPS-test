import type { SurveySection} from "@/types/types";
export const surveySections: SurveySection[] = [
  {
    id: "enps",
    title: "Din arbetsplats",
    description: "Vi börjar med några övergripande frågor.",
    questions: [
      {
        id: "enps",
        text: "Hur sannolikt är det att du skulle rekommendera din arbetsplats till en vän eller bekant?",
        type: "scale",
        required: true,
      },
      {
        id: "satisfaction",
        text: "Hur nöjd är du totalt sett med din arbetsplats?",
        type: "scale",
        required: true,
      },
    ],
  },

  {
    id: "work-environment",
    title: "Arbetsmiljö",
    description: "Nu vill vi veta hur du upplever din arbetsmiljö.",
    questions: [
      {
        id: "work-environment",
        text: "Hur nöjd är du med din arbetsmiljö?",
        type: "scale",
        required: true,
      },
      {
        id: "workload",
        text: "Hur rimlig upplever du din arbetsbelastning?",
        type: "scale",
        required: true,
      },
    ],
  },

  {
    id: "leadership",
    title: "Ledarskap",
    description: "Några frågor om ledarskap och stöd.",
    questions: [
      {
        id: "leadership",
        text: "Hur nöjd är du med ledarskapet?",
        type: "scale",
        required: true,
      },
      {
        id: "support",
        text: "Upplever du att du får det stöd du behöver?",
        type: "scale",
        required: true,
      },
    ],
  },

  {
    id: "development",
    title: "Utveckling",
    questions: [
      {
        id: "development",
        text: "Upplever du att du har möjlighet att utvecklas i ditt arbete?",
        type: "scale",
        required: true,
      },
    ],
  },

  {
    id: "comments",
    title: "Avslutande frågor",
    description: "Här kan du lämna egna synpunkter.",
    questions: [
      {
        id: "comment",
        text: "Vad tycker du att vi kan förbättra?",
        type: "text",
      },
      {
        id: "positive",
        text: "Vad tycker du fungerar särskilt bra?",
        type: "text",
      },
    ],
  },
];
