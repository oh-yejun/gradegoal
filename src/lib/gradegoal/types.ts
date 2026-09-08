export type AssessmentType =
  | "written"
  | "performance";

export type ViewMode =
  | "dashboard"
  | "editor";

export type SemesterCreateMode =
  | "new"
  | "copy";

export type AuthMode =
  | "signin"
  | "signup";

export type OnboardingMode =
  | "first"
  | "edit";

export type SyncStatus =
  | "local"
  | "syncing"
  | "saving"
  | "synced"
  | "error";

export type AssessmentPresetId =
  | "standard"
  | "written70"
  | "performance50"
  | "writtenOnly";

export type QuickAssessmentType =
  | "midterm"
  | "final"
  | "performance"
  | "other";

export type Assessment = {
  id: number;
  name: string;
  type: AssessmentType;
  score: number | null;
  maxScore: number;
  weight: number;
};

export type Subject = {
  id: string;
  name: string;
  targetFinalScore: number;
  targetAssessmentId: number;
  assessments: Assessment[];
};

export type Semester = {
  id: string;
  name: string;
  subjects: Subject[];
};

export type CloudPayload = {
  version: number;
  semesters: Semester[];
  currentSemesterId: string;
  currentSubjectId: string;
  onboardingCompleted?: boolean;
};

export type Result =
  | {
      type: "normal";
      requiredScore: number;
    }
  | {
      type: "already";
    }
  | {
      type: "impossible";
      requiredScore: number;
    }
  | {
      type: "error";
      message: string;
    }
  | null;

export type SubjectAnalysis =
  | {
      status: "normal";
      requiredScore: number;
      requiredPercent: number;
      targetName: string;
      targetMax: number;
    }
  | {
      status: "already";
      targetName: string;
    }
  | {
      status: "impossible";
      requiredScore: number;
      targetName: string;
      targetMax: number;
    }
  | {
      status: "invalid";
      message: string;
    };

export type AssessmentPreset = {
  id: AssessmentPresetId;
  name: string;
  description: string;
  targetIndex: number;
  items: Array<{
    name: string;
    type: AssessmentType;
    maxScore: number;
    weight: number;
  }>;
};