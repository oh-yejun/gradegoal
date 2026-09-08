import type {
  AssessmentPreset,
} from "./types";

export const STORAGE_KEY =
  "gradegoal-data-v8";

export const OLD_STORAGE_KEYS = [
  "gradegoal-data-v7",
  "gradegoal-data-v6",
  "gradegoal-data-v5",
  "gradegoal-data-v4",
  "gradegoal-data-v3",
  "gradegoal-data-v2",
];

export const OLD_V1 =
  "gradegoal-data-v1";

export const CUSTOM_VALUE =
  "__custom__";

export const SEMESTER_PRESETS = [
  "1학년 1학기",
  "1학년 2학기",
  "2학년 1학기",
  "2학년 2학기",
  "3학년 1학기",
  "3학년 2학기",
] as const;

export const SUBJECT_GROUPS = [
  {
    label: "공통·기본",
    subjects: [
      "국어",
      "수학",
      "영어",
      "한국사",
      "통합사회",
      "통합과학",
      "과학탐구실험",
    ],
  },
  {
    label: "국어",
    subjects: [
      "화법과 작문",
      "언어와 매체",
      "독서",
      "문학",
      "화법과 언어",
      "독서와 작문",
    ],
  },
  {
    label: "수학",
    subjects: [
      "수학Ⅰ",
      "수학Ⅱ",
      "대수",
      "미적분Ⅰ",
      "미적분Ⅱ",
      "확률과 통계",
      "기하",
      "경제 수학",
      "인공지능 수학",
    ],
  },
  {
    label: "영어",
    subjects: [
      "영어Ⅰ",
      "영어Ⅱ",
      "영어 독해와 작문",
      "영미 문학 읽기",
    ],
  },
  {
    label: "사회",
    subjects: [
      "사회·문화",
      "생활과 윤리",
      "윤리와 사상",
      "한국지리",
      "세계지리",
      "세계사",
      "동아시아사",
      "경제",
      "정치와 법",
      "세계시민과 지리",
      "현대사회와 윤리",
    ],
  },
  {
    label: "과학",
    subjects: [
      "물리학",
      "화학",
      "생명과학",
      "지구과학",
      "물리학Ⅰ",
      "화학Ⅰ",
      "생명과학Ⅰ",
      "지구과학Ⅰ",
      "물리학Ⅱ",
      "화학Ⅱ",
      "생명과학Ⅱ",
      "지구과학Ⅱ",
    ],
  },
  {
    label: "기타",
    subjects: [
      "정보",
      "기술·가정",
      "한문",
      "체육",
      "음악",
      "미술",
      "진로와 직업",
      "제2외국어",
    ],
  },
] as const;

export const ASSESSMENT_PRESETS: AssessmentPreset[] = [
  {
    id: "standard",
    name: "기본형",
    description:
      "중간 30% + 수행 40% + 기말 30%",
    targetIndex: 2,
    items: [
      {
        name: "중간고사",
        type: "written",
        maxScore: 100,
        weight: 30,
      },
      {
        name: "수행평가",
        type: "performance",
        maxScore: 100,
        weight: 40,
      },
      {
        name: "기말고사",
        type: "written",
        maxScore: 100,
        weight: 30,
      },
    ],
  },
  {
    id: "written70",
    name: "지필 70형",
    description:
      "중간 35% + 수행 30% + 기말 35%",
    targetIndex: 2,
    items: [
      {
        name: "중간고사",
        type: "written",
        maxScore: 100,
        weight: 35,
      },
      {
        name: "수행평가",
        type: "performance",
        maxScore: 100,
        weight: 30,
      },
      {
        name: "기말고사",
        type: "written",
        maxScore: 100,
        weight: 35,
      },
    ],
  },
  {
    id: "performance50",
    name: "수행 50형",
    description:
      "중간 25% + 수행 50% + 기말 25%",
    targetIndex: 2,
    items: [
      {
        name: "중간고사",
        type: "written",
        maxScore: 100,
        weight: 25,
      },
      {
        name: "수행평가",
        type: "performance",
        maxScore: 100,
        weight: 50,
      },
      {
        name: "기말고사",
        type: "written",
        maxScore: 100,
        weight: 25,
      },
    ],
  },
  {
    id: "writtenOnly",
    name: "지필 중심형",
    description:
      "중간 50% + 기말 50%",
    targetIndex: 1,
    items: [
      {
        name: "중간고사",
        type: "written",
        maxScore: 100,
        weight: 50,
      },
      {
        name: "기말고사",
        type: "written",
        maxScore: 100,
        weight: 50,
      },
    ],
  },
];

export const DEFAULT_SUBJECTS = [
  "국어",
  "수학",
  "영어",
];

export const DEFAULT_SEMESTER =
  "1학년 1학기";

export const DEFAULT_TARGET_SCORE =
  90;

export const CLOUD_SAVE_DELAY_MS =
  700;