"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AssessmentType = "written" | "performance";
type ViewMode = "dashboard" | "editor";
type SemesterCreateMode = "new" | "copy";
type AuthMode = "signin" | "signup";
type OnboardingMode = "first" | "edit";

type SyncStatus =
  | "local"
  | "syncing"
  | "saving"
  | "synced"
  | "error";

type AssessmentPresetId =
  | "standard"
  | "written70"
  | "performance50"
  | "writtenOnly";

type QuickAssessmentType =
  | "midterm"
  | "final"
  | "performance"
  | "other";

type Assessment = {
  id: number;
  name: string;
  type: AssessmentType;
  score: number | null;
  maxScore: number;
  weight: number;
};

type Subject = {
  id: string;
  name: string;
  targetFinalScore: number;
  targetAssessmentId: number;
  assessments: Assessment[];
};

type Semester = {
  id: string;
  name: string;
  subjects: Subject[];
};

type CloudPayload = {
  version: number;
  semesters: Semester[];
  currentSemesterId: string;
  currentSubjectId: string;
  onboardingCompleted?: boolean;
};

type Result =
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

type SubjectAnalysis =
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

type AssessmentPreset = {
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

const STORAGE_KEY = "gradegoal-data-v7";

const OLD_STORAGE_KEYS = [
  "gradegoal-data-v6",
  "gradegoal-data-v5",
  "gradegoal-data-v4",
  "gradegoal-data-v3",
  "gradegoal-data-v2",
];

const OLD_V1 = "gradegoal-data-v1";

const CUSTOM_VALUE = "__custom__";

const SEMESTER_PRESETS = [
  "1학년 1학기",
  "1학년 2학기",
  "2학년 1학기",
  "2학년 2학기",
  "3학년 1학기",
  "3학년 2학기",
];

const SUBJECT_GROUPS = [
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
];

const ASSESSMENT_PRESETS: AssessmentPreset[] = [
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

function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createAssessmentsFromPreset(
  presetId: AssessmentPresetId
) {
  const preset =
    ASSESSMENT_PRESETS.find(
      (item) => item.id === presetId
    ) ?? ASSESSMENT_PRESETS[0];

  const assessments: Assessment[] =
    preset.items.map((item, index) => ({
      id: index + 1,
      name: item.name,
      type: item.type,
      score: null,
      maxScore: item.maxScore,
      weight: item.weight,
    }));

  return {
    assessments,
    targetAssessmentId:
      assessments[preset.targetIndex].id,
  };
}

function createSubject(name: string): Subject {
  const preset =
    createAssessmentsFromPreset("standard");

  return {
    id: createId(),
    name,
    targetFinalScore: 90,
    targetAssessmentId:
      preset.targetAssessmentId,
    assessments:
      preset.assessments,
  };
}

function createSemester(
  name: string,
  firstSubject = "수학"
): Semester {
  return {
    id: createId(),
    name,
    subjects: [
      createSubject(firstSubject),
    ],
  };
}

function cloneSubjectTemplate(subject: Subject): Subject {
  return {
    id: createId(),
    name: subject.name,
    targetFinalScore:
      subject.targetFinalScore,
    targetAssessmentId:
      subject.targetAssessmentId,
    assessments:
      subject.assessments.map(
        (assessment) => ({
          ...assessment,
          score: null,
        })
      ),
  };
}

function normalizeAssessment(
  assessment: Assessment
): Assessment {
  return {
    ...assessment,
    score:
      typeof assessment.score === "number"
        ? assessment.score
        : null,
  };
}

function normalizeSubject(subject: Subject): Subject {
  return {
    ...subject,
    assessments:
      Array.isArray(subject.assessments)
        ? subject.assessments.map(
            normalizeAssessment
          )
        : [],
  };
}

function normalizeSemester(semester: Semester): Semester {
  return {
    ...semester,
    subjects:
      Array.isArray(semester.subjects)
        ? semester.subjects.map(
            normalizeSubject
          )
        : [],
  };
}

function normalizePayload(payload: CloudPayload) {
  if (
    !payload ||
    !Array.isArray(payload.semesters) ||
    payload.semesters.length === 0
  ) {
    return null;
  }

  const semesters =
    payload.semesters
      .map(normalizeSemester)
      .filter(
        (semester) =>
          semester.subjects.length > 0
      );

  if (semesters.length === 0) {
    return null;
  }

  const semester =
    semesters.find(
      (item) =>
        item.id ===
        payload.currentSemesterId
    ) ?? semesters[0];

  const subject =
    semester.subjects.find(
      (item) =>
        item.id ===
        payload.currentSubjectId
    ) ?? semester.subjects[0];

  return {
    semesters,
    currentSemesterId:
      semester.id,
    currentSubjectId:
      subject.id,
    onboardingCompleted:
      payload.onboardingCompleted ?? true,
  };
}

function analyzeSubject(
  subject: Subject
): SubjectAnalysis {
  const totalWeight =
    subject.assessments.reduce(
      (sum, item) =>
        sum + item.weight,
      0
    );

  if (
    Math.abs(totalWeight - 100) >
    0.01
  ) {
    return {
      status: "invalid",
      message:
        `반영비율 ${totalWeight}%`,
    };
  }

  if (
    subject.targetFinalScore < 0 ||
    subject.targetFinalScore > 100
  ) {
    return {
      status: "invalid",
      message: "목표점수 오류",
    };
  }

  const target =
    subject.assessments.find(
      (item) =>
        item.id ===
        subject.targetAssessmentId
    );

  if (!target) {
    return {
      status: "invalid",
      message: "계산 대상 없음",
    };
  }

  if (
    target.maxScore <= 0 ||
    target.weight <= 0
  ) {
    return {
      status: "invalid",
      message: "평가 설정 오류",
    };
  }

  for (
    const item of
    subject.assessments
  ) {
    if (item.maxScore <= 0) {
      return {
        status: "invalid",
        message:
          `${item.name} 만점 오류`,
      };
    }

    if (
      item.weight < 0 ||
      item.weight > 100
    ) {
      return {
        status: "invalid",
        message:
          `${item.name} 비중 오류`,
      };
    }

    if (
      item.id !==
      subject.targetAssessmentId
    ) {
      if (item.score === null) {
        return {
          status: "invalid",
          message:
            `${item.name} 점수 미입력`,
        };
      }

      if (
        item.score < 0 ||
        item.score > item.maxScore
      ) {
        return {
          status: "invalid",
          message:
            `${item.name} 점수 오류`,
        };
      }
    }
  }

  const completed =
    subject.assessments
      .filter(
        (item) =>
          item.id !==
          subject.targetAssessmentId
      )
      .reduce(
        (sum, item) => {
          const score =
            item.score ?? 0;

          return (
            sum +
            (score /
              item.maxScore) *
              item.weight
          );
        },
        0
      );

  const requiredScore =
    ((subject.targetFinalScore -
      completed) /
      target.weight) *
    target.maxScore;

  if (requiredScore <= 0) {
    return {
      status: "already",
      targetName:
        target.name,
    };
  }

  if (
    requiredScore >
    target.maxScore
  ) {
    return {
      status: "impossible",
      requiredScore,
      targetName:
        target.name,
      targetMax:
        target.maxScore,
    };
  }

  return {
    status: "normal",
    requiredScore,

    requiredPercent:
      (requiredScore /
        target.maxScore) *
      100,

    targetName:
      target.name,

    targetMax:
      target.maxScore,
  };
}

function clearLocalGradeGoalData() {
  localStorage.removeItem(
    STORAGE_KEY
  );

  for (
    const key of
    OLD_STORAGE_KEYS
  ) {
    localStorage.removeItem(key);
  }

  localStorage.removeItem(
    OLD_V1
  );
}

export default function Home() {
  const [
    semesters,
    setSemesters,
  ] =
    useState<Semester[]>([]);

  const [
    currentSemesterId,
    setCurrentSemesterId,
  ] = useState("");

  const [
    currentSubjectId,
    setCurrentSubjectId,
  ] = useState("");

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      "dashboard"
    );

  const [
    previewScore,
    setPreviewScore,
  ] = useState(90);

  const [
    result,
    setResult,
  ] =
    useState<Result>(null);

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  /*
   * 온보딩
   */
  const [
    onboardingCompleted,
    setOnboardingCompleted,
  ] = useState(false);

  const [
    onboardingOpen,
    setOnboardingOpen,
  ] = useState(false);

  const [
    onboardingMode,
    setOnboardingMode,
  ] =
    useState<OnboardingMode>(
      "first"
    );

  const [
    onboardingStep,
    setOnboardingStep,
  ] = useState(1);

  const [
    onboardingSemesterChoice,
    setOnboardingSemesterChoice,
  ] = useState(
    "1학년 1학기"
  );

  const [
    onboardingCustomSemester,
    setOnboardingCustomSemester,
  ] = useState("");

  const [
    onboardingSubjects,
    setOnboardingSubjects,
  ] = useState<string[]>([
    "국어",
    "수학",
    "영어",
  ]);

  const [
    onboardingCustomSubject,
    setOnboardingCustomSubject,
  ] = useState("");

  /*
   * 로그인
   */
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    authReady,
    setAuthReady,
  ] = useState(false);

  const [
    showAuth,
    setShowAuth,
  ] = useState(false);

  const [
    authMode,
    setAuthMode,
  ] =
    useState<AuthMode>(
      "signin"
    );

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    authBusy,
    setAuthBusy,
  ] = useState(false);

  const [
    authMessage,
    setAuthMessage,
  ] = useState("");

  /*
   * 클라우드
   */
  const [
    cloudReady,
    setCloudReady,
  ] = useState(false);

  const [
    syncStatus,
    setSyncStatus,
  ] =
    useState<SyncStatus>(
      "local"
    );

  const localSnapshotRef =
    useRef<CloudPayload | null>(
      null
    );

  const loadedUserRef =
    useRef<string | null>(
      null
    );

  /*
   * 학기 추가
   */
  const [
    showSemesterAdder,
    setShowSemesterAdder,
  ] = useState(false);

  const [
    semesterChoice,
    setSemesterChoice,
  ] = useState(
    SEMESTER_PRESETS[0]
  );

  const [
    customSemesterName,
    setCustomSemesterName,
  ] = useState("");

  const [
    semesterCreateMode,
    setSemesterCreateMode,
  ] =
    useState<SemesterCreateMode>(
      "new"
    );

  const [
    semesterCopySourceId,
    setSemesterCopySourceId,
  ] = useState("");

  const [
    semesterFirstSubjectChoice,
    setSemesterFirstSubjectChoice,
  ] = useState("수학");

  const [
    customSemesterFirstSubject,
    setCustomSemesterFirstSubject,
  ] = useState("");

  /*
   * 과목 추가
   */
  const [
    showSubjectAdder,
    setShowSubjectAdder,
  ] = useState(false);

  const [
    subjectChoice,
    setSubjectChoice,
  ] = useState("국어");

  const [
    customSubjectName,
    setCustomSubjectName,
  ] = useState("");

  /*
   * 평가 빠른 설정
   */
  const [
    assessmentPresetChoice,
    setAssessmentPresetChoice,
  ] =
    useState<AssessmentPresetId>(
      "standard"
    );

  /*
   * 로컬 데이터 로드
   */
  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {

        try {
          const keys = [
            STORAGE_KEY,
            ...OLD_STORAGE_KEYS,
          ];

          for (
            const key of keys
          ) {
            const saved =
              localStorage.getItem(
                key
              );

            if (!saved) {
              continue;
            }

            const parsed =
              JSON.parse(saved);

            if (
              Array.isArray(
                parsed.semesters
              ) &&
              parsed.semesters.length >
                0
            ) {
              const normalized =
                normalizePayload({
                  version:
                    parsed.version ??
                    1,

                  semesters:
                    parsed.semesters,

                  currentSemesterId:
                    parsed.currentSemesterId,

                  currentSubjectId:
                    parsed.currentSubjectId,

                  onboardingCompleted:
                    parsed.onboardingCompleted,
                });

              if (normalized) {
                setSemesters(
                  normalized.semesters
                );

                setCurrentSemesterId(
                  normalized.currentSemesterId
                );

                setCurrentSubjectId(
                  normalized.currentSubjectId
                );

                setSemesterCopySourceId(
                  normalized.currentSemesterId
                );

                setOnboardingCompleted(
                  normalized.onboardingCompleted
                );

                setHydrated(true);

                return;
              }
            }
          }

          const oldV1 =
            localStorage.getItem(
              OLD_V1
            );

          if (oldV1) {
            const old =
              JSON.parse(oldV1);

            if (
              Array.isArray(
                old.subjects
              ) &&
              old.subjects.length > 0
            ) {
              const semester: Semester =
                {
                  id: createId(),

                  name:
                    old.semesterName ||
                    "1학년 1학기",

                  subjects:
                    old.subjects.map(
                      normalizeSubject
                    ),
                };

              const subject =
                semester.subjects.find(
                  (item) =>
                    item.id ===
                    old.currentSubjectId
                ) ??
                semester.subjects[0];

              setSemesters([
                semester,
              ]);

              setCurrentSemesterId(
                semester.id
              );

              setCurrentSubjectId(
                subject.id
              );

              setSemesterCopySourceId(
                semester.id
              );

              setOnboardingCompleted(
                true
              );

              setHydrated(true);

              return;
            }
          }
        } catch (error) {
          console.error(
            "로컬 데이터 로드 오류",
            error
          );
        }

        const initial =
          createSemester(
            "1학년 1학기",
            "수학"
          );

        setSemesters([
          initial,
        ]);

        setCurrentSemesterId(
          initial.id
        );

        setCurrentSubjectId(
          initial.subjects[0].id
        );

        setSemesterCopySourceId(
          initial.id
        );

        setOnboardingCompleted(
          false
        );

        setOnboardingMode(
          "first"
        );

        setOnboardingOpen(
          true
        );

        setHydrated(
          true
        );
        },
        0
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, []);

  /*
   * 로그인 상태
   */
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const {
        data,
      } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setUser(
        data.session?.user ??
          null
      );

      setAuthReady(true);
    }

    initializeAuth();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          const nextUser =
            session?.user ??
            null;

          setUser(
            nextUser
          );

          if (!nextUser) {
            setCloudReady(
              false
            );

            setSyncStatus(
              "local"
            );

            loadedUserRef.current =
              null;
          }
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  /*
   * Snapshot
   */
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    localSnapshotRef.current =
      {
        version: 3,
        semesters,
        currentSemesterId,
        currentSubjectId,
        onboardingCompleted,
      };
  }, [
    semesters,
    currentSemesterId,
    currentSubjectId,
    onboardingCompleted,
    hydrated,
  ]);

  /*
   * LocalStorage 저장
   */
  useEffect(() => {
    if (
      !hydrated ||
      semesters.length === 0
    ) {
      return;
    }

    const payload: CloudPayload =
      {
        version: 3,
        semesters,
        currentSemesterId,
        currentSubjectId,
        onboardingCompleted,
      };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        payload
      )
    );
  }, [
    semesters,
    currentSemesterId,
    currentSubjectId,
    onboardingCompleted,
    hydrated,
  ]);

  const userId =
    user?.id ?? null;

  /*
   * 클라우드 상태 반영 함수
   *
   * Effect 자체가 직접 setState를 호출하지 않도록
   * 상태 변경을 안정된 callback으로 분리합니다.
   */

  const beginCloudSync =
    useCallback(() => {
      setCloudReady(false);
      setSyncStatus("syncing");
    }, []);

  const failCloudSync =
    useCallback(() => {
      setSyncStatus("error");
      loadedUserRef.current = null;
    }, []);

  const finishCloudSync =
    useCallback(
      (
        normalized?:
          NonNullable<
            ReturnType<
              typeof normalizePayload
            >
          >
      ) => {
        if (normalized) {
          setSemesters(
            normalized.semesters
          );

          setCurrentSemesterId(
            normalized.currentSemesterId
          );

          setCurrentSubjectId(
            normalized.currentSubjectId
          );

          setSemesterCopySourceId(
            normalized.currentSemesterId
          );

          setOnboardingCompleted(
            normalized.onboardingCompleted
          );

          if (
            !normalized.onboardingCompleted
          ) {
            setOnboardingMode(
              "first"
            );

            setOnboardingOpen(
              true
            );
          }
        }

        setCloudReady(true);
        setSyncStatus("synced");
      },
      []
    );

  /*
   * 최초 클라우드 동기화
   */
  useEffect(() => {
    if (
      !hydrated ||
      !authReady ||
      !userId
    ) {
      return;
    }

    if (
      loadedUserRef.current ===
      userId
    ) {
      return;
    }

    loadedUserRef.current =
      userId;

    let cancelled =
      false;

    /*
     * 로딩 상태 변경은 timer callback에서 실행하여
     * Effect 본문의 동기적 setState를 피합니다.
     */
    const statusTimer =
      window.setTimeout(
        () => {
          if (
            cancelled
          ) {
            return;
          }

          beginCloudSync();
        },
        0
      );

    async function syncCloud() {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "gradegoal_data"
          )
          .select("data")
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      if (
        cancelled
      ) {
        return;
      }

      if (error) {
        console.error(
          error
        );

        failCloudSync();

        return;
      }

      /*
       * 기존 Cloud 데이터가 있으면
       * Cloud 데이터를 현재 앱 상태에 적용
       */
      if (
        data?.data
      ) {
        const normalized =
          normalizePayload(
            data.data as CloudPayload
          );

        if (
          normalized
        ) {
          finishCloudSync(
            normalized
          );

          return;
        }
      }

      /*
       * Cloud 데이터가 없다면
       * 현재 로컬 데이터를 최초 업로드
       */
      const local =
        localSnapshotRef.current;

      if (!local) {
        failCloudSync();

        return;
      }

      const {
        error:
          uploadError,
      } =
        await supabase
          .from(
            "gradegoal_data"
          )
          .upsert(
            {
              user_id:
                userId,

              data:
                local,
            },
            {
              onConflict:
                "user_id",
            }
          );

      if (
        cancelled
      ) {
        return;
      }

      if (
        uploadError
      ) {
        console.error(
          uploadError
        );

        failCloudSync();

        return;
      }

      finishCloudSync();
    }

    void syncCloud();

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        statusTimer
      );
    };
  }, [
    hydrated,
    authReady,
    userId,
    beginCloudSync,
    failCloudSync,
    finishCloudSync,
  ]);

  /*
   * 클라우드 자동 저장
   */
  useEffect(() => {
    if (
      !hydrated ||
      !cloudReady ||
      !userId ||
      semesters.length === 0
    ) {
      return;
    }

    /*
     * 상태 변경도 debounce callback 안에서 실행합니다.
     * 빠르게 연속 입력할 경우 이전 timer는 취소됩니다.
     */
    const timer =
      window.setTimeout(
        async () => {
          setSyncStatus(
            "saving"
          );

          const payload: CloudPayload =
            {
              version: 3,
              semesters,
              currentSemesterId,
              currentSubjectId,
              onboardingCompleted,
            };

          const {
            error,
          } =
            await supabase
              .from(
                "gradegoal_data"
              )
              .upsert(
                {
                  user_id:
                    userId,

                  data:
                    payload,
                },
                {
                  onConflict:
                    "user_id",
                }
              );

          if (error) {
            console.error(
              error
            );

            setSyncStatus(
              "error"
            );

            return;
          }

          setSyncStatus(
            "synced"
          );
        },
        700
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    semesters,
    currentSemesterId,
    currentSubjectId,
    onboardingCompleted,
    hydrated,
    cloudReady,
    userId,
  ]);

  /*
   * 현재 학기 / 과목
   */
  const currentSemester =
    semesters.find(
      (semester) =>
        semester.id ===
        currentSemesterId
    ) ??
    semesters[0];

  const subjects =
    useMemo(
      () =>
        currentSemester?.subjects ??
        [],
      [
        currentSemester,
      ]
    );

  const currentSubject =
    subjects.find(
      (subject) =>
        subject.id ===
        currentSubjectId
    ) ??
    subjects[0];

  const assessments =
    currentSubject?.assessments ??
    [];

  const targetFinalScore =
    currentSubject?.targetFinalScore ??
    90;

  const targetAssessmentId =
    currentSubject?.targetAssessmentId ??
    0;

  const targetAssessment =
    assessments.find(
      (item) =>
        item.id ===
        targetAssessmentId
    );

  const totalWeight =
    assessments.reduce(
      (sum, item) =>
        sum + item.weight,
      0
    );

  const analyses =
    useMemo(
      () =>
        subjects.map(
          (subject) => ({
            subject,
            analysis:
              analyzeSubject(
                subject
              ),
          })
        ),
      [subjects]
    );

  const configuredCount =
    analyses.filter(
      ({
        analysis,
      }) =>
        analysis.status !==
        "invalid"
    ).length;

  const possibleCount =
    analyses.filter(
      ({
        analysis,
      }) =>
        analysis.status ===
          "normal" ||
        analysis.status ===
          "already"
    ).length;

  const warningCount =
    analyses.filter(
      ({
        analysis,
      }) =>
        analysis.status ===
          "impossible" ||
        analysis.status ===
          "invalid"
    ).length;

  const averageTarget =
    subjects.length > 0
      ? subjects.reduce(
          (
            sum,
            subject
          ) =>
            sum +
            subject.targetFinalScore,
          0
        ) /
        subjects.length
      : 0;

  /*
   * Auth
   */
  async function handleAuth(
    event: FormEvent
  ) {
    event.preventDefault();

    setAuthMessage("");

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setAuthMessage(
        "이메일을 입력해주세요."
      );

      return;
    }

    if (
      password.length < 6
    ) {
      setAuthMessage(
        "비밀번호는 최소 6자 이상 입력해주세요."
      );

      return;
    }

    setAuthBusy(
      true
    );

    try {
      if (
        authMode ===
        "signup"
      ) {
        const {
          data,
          error,
        } =
          await supabase.auth.signUp(
            {
              email:
                cleanEmail,
              password,
            }
          );

        if (error) {
          setAuthMessage(
            error.message
          );

          return;
        }

        if (
          data.session
        ) {
          setAuthMessage(
            "회원가입과 로그인이 완료되었습니다."
          );

          setShowAuth(
            false
          );
        } else {
          setAuthMessage(
            "회원가입이 완료되었습니다. 이메일 인증 링크를 확인해주세요."
          );
        }
      } else {
        const {
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                cleanEmail,
              password,
            }
          );

        if (error) {
          setAuthMessage(
            "이메일 또는 비밀번호를 확인해주세요."
          );

          return;
        }

        setPassword("");

        setShowAuth(
          false
        );
      }
    } finally {
      setAuthBusy(
        false
      );
    }
  }

  async function handleSignOut() {
    setCloudReady(
      false
    );

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      alert(
        "로그아웃 중 오류가 발생했습니다."
      );

      return;
    }

    clearLocalGradeGoalData();

    const initial =
      createSemester(
        "1학년 1학기",
        "수학"
      );

    setSemesters([
      initial,
    ]);

    setCurrentSemesterId(
      initial.id
    );

    setCurrentSubjectId(
      initial.subjects[0].id
    );

    setSemesterCopySourceId(
      initial.id
    );

    setOnboardingCompleted(
      false
    );

    setOnboardingMode(
      "first"
    );

    setOnboardingStep(
      1
    );

    setOnboardingSubjects([
      "국어",
      "수학",
      "영어",
    ]);

    setOnboardingOpen(
      true
    );

    setResult(null);

    setPreviewScore(
      90
    );

    setViewMode(
      "dashboard"
    );

    setSyncStatus(
      "local"
    );

    loadedUserRef.current =
      null;
  }

  /*
   * 온보딩
   */
  function toggleOnboardingSubject(
    name: string
  ) {
    setOnboardingSubjects(
      (prev) => {
        if (
          prev.includes(name)
        ) {
          return prev.filter(
            (subject) =>
              subject !==
              name
          );
        }

        return [
          ...prev,
          name,
        ];
      }
    );
  }

  function addCustomOnboardingSubject() {
    const name =
      onboardingCustomSubject.trim();

    if (!name) {
      return;
    }

    if (
      onboardingSubjects.includes(
        name
      )
    ) {
      setOnboardingCustomSubject(
        ""
      );

      return;
    }

    setOnboardingSubjects(
      (prev) => [
        ...prev,
        name,
      ]
    );

    setOnboardingCustomSubject(
      ""
    );
  }

  function getOnboardingSemesterName() {
    if (
      onboardingSemesterChoice ===
      CUSTOM_VALUE
    ) {
      return onboardingCustomSemester.trim();
    }

    return onboardingSemesterChoice;
  }

  function nextOnboardingStep() {
    if (
      onboardingStep === 1 &&
      !getOnboardingSemesterName()
    ) {
      alert(
        "학기 이름을 입력해주세요."
      );

      return;
    }

    if (
      onboardingStep === 2 &&
      onboardingSubjects.length === 0
    ) {
      alert(
        "최소 한 개의 과목을 선택해주세요."
      );

      return;
    }

    setOnboardingStep(
      (prev) =>
        Math.min(
          prev + 1,
          3
        )
    );
  }

  function finishOnboarding() {
    const semesterName =
      getOnboardingSemesterName();

    if (!semesterName) {
      alert(
        "학기 이름을 입력해주세요."
      );

      return;
    }

    const uniqueSubjects =
      Array.from(
        new Set(
          onboardingSubjects
            .map(
              (name) =>
                name.trim()
            )
            .filter(Boolean)
        )
      );

    if (
      uniqueSubjects.length === 0
    ) {
      alert(
        "최소 한 개의 과목을 선택해주세요."
      );

      return;
    }

    if (
      onboardingMode ===
      "first"
    ) {
      const newSubjects =
        uniqueSubjects.map(
          createSubject
        );

      const semester: Semester =
        {
          id: createId(),
          name:
            semesterName,
          subjects:
            newSubjects,
        };

      setSemesters([
        semester,
      ]);

      setCurrentSemesterId(
        semester.id
      );

      setCurrentSubjectId(
        newSubjects[0].id
      );

      setSemesterCopySourceId(
        semester.id
      );
    } else {
      const existingByName =
        new Map(
          currentSemester.subjects.map(
            (subject) => [
              subject.name,
              subject,
            ]
          )
        );

      const removedSubjects =
        currentSemester.subjects.filter(
          (subject) =>
            !uniqueSubjects.includes(
              subject.name
            )
        );

      if (
        removedSubjects.length >
        0
      ) {
        const confirmed =
          window.confirm(
            `${removedSubjects.length}개 기존 과목이 목록에서 제거됩니다. 계속할까요?`
          );

        if (!confirmed) {
          return;
        }
      }

      const nextSubjects =
        uniqueSubjects.map(
          (name) =>
            existingByName.get(
              name
            ) ??
            createSubject(
              name
            )
        );

      setSemesters(
        (prev) =>
          prev.map(
            (semester) =>
              semester.id ===
              currentSemesterId
                ? {
                    ...semester,
                    name:
                      semesterName,
                    subjects:
                      nextSubjects,
                  }
                : semester
          )
      );

      setCurrentSubjectId(
        nextSubjects[0].id
      );
    }

    setOnboardingCompleted(
      true
    );

    setOnboardingOpen(
      false
    );

    setOnboardingStep(
      1
    );

    setViewMode(
      "dashboard"
    );

    setResult(null);
  }

  function openQuickSetup() {
    if (
      SEMESTER_PRESETS.includes(
        currentSemester.name
      )
    ) {
      setOnboardingSemesterChoice(
        currentSemester.name
      );

      setOnboardingCustomSemester(
        ""
      );
    } else {
      setOnboardingSemesterChoice(
        CUSTOM_VALUE
      );

      setOnboardingCustomSemester(
        currentSemester.name
      );
    }

    setOnboardingSubjects(
      currentSemester.subjects.map(
        (subject) =>
          subject.name
      )
    );

    setOnboardingCustomSubject(
      ""
    );

    setOnboardingMode(
      "edit"
    );

    setOnboardingStep(
      1
    );

    setOnboardingOpen(
      true
    );
  }

  /*
   * 기본 수정
   */
  function updateCurrentSemester(
    patch: Partial<Semester>
  ) {
    setSemesters(
      (prev) =>
        prev.map(
          (semester) =>
            semester.id ===
            currentSemesterId
              ? {
                  ...semester,
                  ...patch,
                }
              : semester
        )
    );
  }

  function updateSubjects(
    updater: (
      subjects: Subject[]
    ) => Subject[]
  ) {
    setSemesters(
      (prev) =>
        prev.map(
          (semester) =>
            semester.id ===
            currentSemesterId
              ? {
                  ...semester,

                  subjects:
                    updater(
                      semester.subjects
                    ),
                }
              : semester
        )
    );
  }

  function updateCurrentSubject(
    patch: Partial<Subject>
  ) {
    updateSubjects(
      (prev) =>
        prev.map(
          (subject) =>
            subject.id ===
            currentSubjectId
              ? {
                  ...subject,
                  ...patch,
                }
              : subject
        )
    );

    setResult(null);
  }

  function updateAssessments(
    updater: (
      assessments: Assessment[]
    ) => Assessment[]
  ) {
    updateSubjects(
      (prev) =>
        prev.map(
          (subject) =>
            subject.id ===
            currentSubjectId
              ? {
                  ...subject,

                  assessments:
                    updater(
                      subject.assessments
                    ),
                }
              : subject
        )
    );

    setResult(null);
  }

  function updateAssessment(
    id: number,
    patch: Partial<Assessment>
  ) {
    updateAssessments(
      (prev) =>
        prev.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                }
              : item
        )
    );
  }

  /*
   * 학기 관리
   */
  function addSemesterFromSelection() {
    const semesterName =
      semesterChoice ===
      CUSTOM_VALUE
        ? customSemesterName.trim()
        : semesterChoice;

    if (!semesterName) {
      alert(
        "학기 이름을 입력해주세요."
      );

      return;
    }

    if (
      semesters.some(
        (semester) =>
          semester.name.trim() ===
          semesterName
      )
    ) {
      alert(
        "같은 이름의 학기가 이미 있습니다."
      );

      return;
    }

    let newSubjects: Subject[];

    if (
      semesterCreateMode ===
      "copy"
    ) {
      const source =
        semesters.find(
          (semester) =>
            semester.id ===
            semesterCopySourceId
        );

      if (!source) {
        alert(
          "복사할 학기를 선택해주세요."
        );

        return;
      }

      newSubjects =
        source.subjects.map(
          cloneSubjectTemplate
        );
    } else {
      const firstSubject =
        semesterFirstSubjectChoice ===
        CUSTOM_VALUE
          ? customSemesterFirstSubject.trim()
          : semesterFirstSubjectChoice;

      if (!firstSubject) {
        alert(
          "첫 과목을 선택해주세요."
        );

        return;
      }

      newSubjects = [
        createSubject(
          firstSubject
        ),
      ];
    }

    const semester: Semester =
      {
        id: createId(),
        name:
          semesterName,
        subjects:
          newSubjects,
      };

    setSemesters(
      (prev) => [
        ...prev,
        semester,
      ]
    );

    setCurrentSemesterId(
      semester.id
    );

    setCurrentSubjectId(
      semester.subjects[0].id
    );

    setSemesterCopySourceId(
      semester.id
    );

    setShowSemesterAdder(
      false
    );

    setCustomSemesterName(
      ""
    );

    setCustomSemesterFirstSubject(
      ""
    );

    setResult(null);

    setPreviewScore(
      90
    );
  }

  function removeSemester() {
    if (
      semesters.length <= 1
    ) {
      alert(
        "최소 한 개의 학기는 남아 있어야 합니다."
      );

      return;
    }

    const index =
      semesters.findIndex(
        (semester) =>
          semester.id ===
          currentSemesterId
      );

    const remaining =
      semesters.filter(
        (semester) =>
          semester.id !==
          currentSemesterId
      );

    const next =
      remaining[
        Math.min(
          index,
          remaining.length - 1
        )
      ];

    setSemesters(
      remaining
    );

    setCurrentSemesterId(
      next.id
    );

    setCurrentSubjectId(
      next.subjects[0].id
    );

    setSemesterCopySourceId(
      next.id
    );

    setResult(null);
  }

  function switchSemester(
    id: string
  ) {
    const semester =
      semesters.find(
        (item) =>
          item.id === id
      );

    if (!semester) {
      return;
    }

    setCurrentSemesterId(
      semester.id
    );

    setCurrentSubjectId(
      semester.subjects[0].id
    );

    setSemesterCopySourceId(
      semester.id
    );

    setPreviewScore(
      90
    );

    setResult(null);
  }

  /*
   * 과목 관리
   */
  function addSubjectFromSelection() {
    const name =
      subjectChoice ===
      CUSTOM_VALUE
        ? customSubjectName.trim()
        : subjectChoice;

    if (!name) {
      alert(
        "과목 이름을 입력해주세요."
      );

      return;
    }

    if (
      subjects.some(
        (subject) =>
          subject.name.trim() ===
          name
      )
    ) {
      alert(
        `${name} 과목이 이미 등록되어 있습니다.`
      );

      return;
    }

    const subject =
      createSubject(name);

    updateSubjects(
      (prev) => [
        ...prev,
        subject,
      ]
    );

    setCurrentSubjectId(
      subject.id
    );

    setShowSubjectAdder(
      false
    );

    setCustomSubjectName(
      ""
    );

    setPreviewScore(
      90
    );

    setResult(null);

    setViewMode(
      "editor"
    );
  }

  function removeSubject() {
    if (
      subjects.length <= 1
    ) {
      alert(
        "최소 한 개의 과목은 남아 있어야 합니다."
      );

      return;
    }

    const index =
      subjects.findIndex(
        (subject) =>
          subject.id ===
          currentSubjectId
      );

    const remaining =
      subjects.filter(
        (subject) =>
          subject.id !==
          currentSubjectId
      );

    const next =
      remaining[
        Math.min(
          index,
          remaining.length - 1
        )
      ];

    updateSubjects(
      () => remaining
    );

    setCurrentSubjectId(
      next.id
    );

    setResult(null);

    setViewMode(
      "dashboard"
    );
  }

  function openSubject(
    id: string
  ) {
    setCurrentSubjectId(
      id
    );

    setPreviewScore(
      90
    );

    setResult(null);

    setViewMode(
      "editor"
    );
  }

  /*
   * 평가 관리
   */
  function getNextAssessmentId() {
    if (
      assessments.length === 0
    ) {
      return 1;
    }

    return (
      Math.max(
        ...assessments.map(
          (item) =>
            item.id
        )
      ) + 1
    );
  }

  function getUniqueAssessmentName(
    baseName: string
  ) {
    const names =
      assessments.map(
        (item) =>
          item.name
      );

    if (
      !names.includes(
        baseName
      )
    ) {
      return baseName;
    }

    let index = 2;

    while (
      names.includes(
        `${baseName} ${index}`
      )
    ) {
      index += 1;
    }

    return `${baseName} ${index}`;
  }

  function addQuickAssessment(
    type: QuickAssessmentType
  ) {
    const config: Record<
      QuickAssessmentType,
      {
        name: string;
        type: AssessmentType;
        maxScore: number;
      }
    > = {
      midterm: {
        name: "중간고사",
        type: "written",
        maxScore: 100,
      },

      final: {
        name: "기말고사",
        type: "written",
        maxScore: 100,
      },

      performance: {
        name: "수행평가",
        type: "performance",
        maxScore: 100,
      },

      other: {
        name: "기타 평가",
        type: "performance",
        maxScore: 100,
      },
    };

    const selected =
      config[type];

    const assessment: Assessment =
      {
        id:
          getNextAssessmentId(),

        name:
          getUniqueAssessmentName(
            selected.name
          ),

        type:
          selected.type,

        score:
          null,

        maxScore:
          selected.maxScore,

        weight:
          10,
      };

    updateAssessments(
      (prev) => [
        ...prev,
        assessment,
      ]
    );
  }

  function addAssessment() {
    addQuickAssessment(
      "other"
    );
  }

  function applyAssessmentPreset() {
    const hasEnteredScores =
      assessments.some(
        (item) =>
          item.score !== null
      );

    if (
      hasEnteredScores
    ) {
      const confirmed =
        window.confirm(
          "프리셋을 적용하면 현재 평가 구성과 입력된 점수가 초기화됩니다. 계속할까요?"
        );

      if (!confirmed) {
        return;
      }
    }

    const preset =
      createAssessmentsFromPreset(
        assessmentPresetChoice
      );

    updateCurrentSubject({
      assessments:
        preset.assessments,

      targetAssessmentId:
        preset.targetAssessmentId,
    });

    const target =
      preset.assessments.find(
        (item) =>
          item.id ===
          preset.targetAssessmentId
      );

    if (target) {
      setPreviewScore(
        Math.min(
          target.maxScore,
          90
        )
      );
    }

    setResult(null);
  }

  function removeAssessment(
    id: number
  ) {
    if (
      assessments.length <= 2
    ) {
      alert(
        "평가 항목은 최소 2개가 필요합니다."
      );

      return;
    }

    const remaining =
      assessments.filter(
        (item) =>
          item.id !== id
      );

    let nextTarget =
      targetAssessmentId;

    if (
      id ===
      targetAssessmentId
    ) {
      nextTarget =
        remaining[
          remaining.length - 1
        ].id;
    }

    updateCurrentSubject({
      assessments:
        remaining,

      targetAssessmentId:
        nextTarget,
    });
  }

  function selectTargetAssessment(
    id: number
  ) {
    const selected =
      assessments.find(
        (item) =>
          item.id === id
      );

    updateCurrentSubject({
      targetAssessmentId:
        id,
    });

    if (selected) {
      setPreviewScore(
        Math.min(
          selected.maxScore,
          90
        )
      );
    }
  }

  /*
   * 계산
   */
  function validateInputs() {
    if (
      Math.abs(
        totalWeight - 100
      ) > 0.01
    ) {
      return `평가 비중의 합이 100%가 되어야 합니다. 현재 ${totalWeight}%입니다.`;
    }

    if (!targetAssessment) {
      return "목표 계산 평가를 선택해주세요.";
    }

    if (
      targetFinalScore < 0 ||
      targetFinalScore > 100
    ) {
      return "목표점수는 0~100 사이여야 합니다.";
    }

    for (
      const item of
      assessments
    ) {
      if (
        item.maxScore <= 0
      ) {
        return `${item.name}의 만점을 확인해주세요.`;
      }

      if (
        item.weight < 0 ||
        item.weight > 100
      ) {
        return `${item.name}의 반영비율을 확인해주세요.`;
      }

      if (
        item.id !==
        targetAssessmentId
      ) {
        if (
          item.score ===
          null
        ) {
          return `${item.name}의 받은 점수를 입력해주세요.`;
        }

        if (
          item.score < 0 ||
          item.score >
            item.maxScore
        ) {
          return `${item.name}의 점수를 확인해주세요.`;
        }
      }
    }

    return null;
  }

  function getCompletedContribution() {
    return assessments
      .filter(
        (item) =>
          item.id !==
          targetAssessmentId
      )
      .reduce(
        (sum, item) => {
          const score =
            item.score ?? 0;

          return (
            sum +
            (score /
              item.maxScore) *
              item.weight
          );
        },
        0
      );
  }

  function calculate() {
    const error =
      validateInputs();

    if (error) {
      setResult({
        type: "error",
        message: error,
      });

      return;
    }

    if (!targetAssessment) {
      return;
    }

    const completed =
      getCompletedContribution();

    const requiredScore =
      ((targetFinalScore -
        completed) /
        targetAssessment.weight) *
      targetAssessment.maxScore;

    if (
      requiredScore <= 0
    ) {
      setResult({
        type: "already",
      });

      setPreviewScore(
        0
      );

      return;
    }

    if (
      requiredScore >
      targetAssessment.maxScore
    ) {
      setResult({
        type:
          "impossible",

        requiredScore,
      });

      setPreviewScore(
        targetAssessment.maxScore
      );

      return;
    }

    setResult({
      type: "normal",
      requiredScore,
    });

    setPreviewScore(
      Math.min(
        Math.ceil(
          requiredScore
        ),
        targetAssessment.maxScore
      )
    );
  }

  function calculateFinalScore(
    rawScore: number
  ) {
    if (!targetAssessment) {
      return 0;
    }

    return (
      getCompletedContribution() +
      (rawScore /
        targetAssessment.maxScore) *
        targetAssessment.weight
    );
  }

  const inputsValid =
    validateInputs() ===
    null;

  const safePreviewScore =
    targetAssessment
      ? Math.min(
          Math.max(
            previewScore,
            0
          ),
          targetAssessment.maxScore
        )
      : 0;

  const projectedFinalScore =
    inputsValid &&
    targetAssessment
      ? calculateFinalScore(
          safePreviewScore
        )
      : 0;

  const targetAchieved =
    projectedFinalScore >=
    targetFinalScore;

  const difference =
    targetFinalScore -
    projectedFinalScore;

  const progress =
    targetFinalScore > 0
      ? Math.min(
          Math.max(
            (projectedFinalScore /
              targetFinalScore) *
              100,
            0
          ),
          100
        )
      : 100;

  const simulationScores =
    targetAssessment
      ? [
          0.7,
          0.75,
          0.8,
          0.85,
          0.9,
          0.95,
          1,
        ].map(
          (ratio) =>
            Math.round(
              targetAssessment.maxScore *
                ratio *
                10
            ) / 10
        )
      : [];

  /*
   * Loading
   */
  if (
    !hydrated ||
    !authReady ||
    !currentSemester ||
    !currentSubject
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          GradeGoal을 불러오는 중...
        </p>
      </main>
    );
  }

  if (
    user &&
    syncStatus ===
      "syncing" &&
    !cloudReady
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-lg font-black text-blue-600">
            GradeGoal
          </p>

          <p className="mt-3 text-sm text-slate-500">
            클라우드 데이터를 불러오는 중...
          </p>
        </div>
      </main>
    );
  }

  /*
   * Onboarding
   */
  if (
    onboardingOpen ||
    !onboardingCompleted
  ) {
    return (
      <OnboardingScreen
        step={
          onboardingStep
        }
        mode={
          onboardingMode
        }
        semesterChoice={
          onboardingSemesterChoice
        }
        setSemesterChoice={
          setOnboardingSemesterChoice
        }
        customSemester={
          onboardingCustomSemester
        }
        setCustomSemester={
          setOnboardingCustomSemester
        }
        subjects={
          onboardingSubjects
        }
        toggleSubject={
          toggleOnboardingSubject
        }
        customSubject={
          onboardingCustomSubject
        }
        setCustomSubject={
          setOnboardingCustomSubject
        }
        addCustomSubject={
          addCustomOnboardingSubject
        }
        onBack={() =>
          setOnboardingStep(
            (prev) =>
              Math.max(
                prev - 1,
                1
              )
          )
        }
        onNext={
          nextOnboardingStep
        }
        onFinish={
          finishOnboarding
        }
        onCancel={() => {
          if (
            onboardingMode ===
            "edit"
          ) {
            setOnboardingOpen(
              false
            );

            setOnboardingStep(
              1
            );
          }
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* 상단 */}

      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() =>
              setViewMode(
                "dashboard"
              )
            }
            className="text-lg font-black text-blue-600"
          >
            GradeGoal
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl bg-slate-100 p-1 sm:flex">
              <button
                onClick={() =>
                  setViewMode(
                    "dashboard"
                  )
                }
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  viewMode ===
                  "dashboard"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                대시보드
              </button>

              <button
                onClick={() =>
                  setViewMode(
                    "editor"
                  )
                }
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  viewMode ===
                  "editor"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                과목 편집
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden text-right md:block">
                  <p className="max-w-52 truncate text-xs font-semibold text-slate-700">
                    {user.email}
                  </p>

                  <p
                    className={`text-[11px] ${
                      syncStatus ===
                      "error"
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    <SyncLabel
                      status={
                        syncStatus
                      }
                    />
                  </p>
                </div>

                <button
                  onClick={
                    handleSignOut
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowAuth(
                    !showAuth
                  );

                  setAuthMessage(
                    ""
                  );
                }}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Auth */}

      {!user &&
        showAuth && (
          <div className="border-b border-blue-100 bg-blue-50">
            <div className="mx-auto max-w-md px-4 py-7">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    onClick={() => {
                      setAuthMode(
                        "signin"
                      );

                      setAuthMessage(
                        ""
                      );
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                      authMode ===
                      "signin"
                        ? "bg-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    로그인
                  </button>

                  <button
                    onClick={() => {
                      setAuthMode(
                        "signup"
                      );

                      setAuthMessage(
                        ""
                      );
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                      authMode ===
                      "signup"
                        ? "bg-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    회원가입
                  </button>
                </div>

                <form
                  onSubmit={
                    handleAuth
                  }
                  className="mt-5 space-y-4"
                >
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-600">
                      이메일
                    </span>

                    <input
                      type="email"
                      value={
                        email
                      }
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-600">
                      비밀번호
                    </span>

                    <input
                      type="password"
                      value={
                        password
                      }
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      placeholder="6자 이상"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  {authMessage && (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">
                      {
                        authMessage
                      }
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      authBusy
                    }
                    className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white disabled:opacity-50"
                  >
                    {authBusy
                      ? "처리 중..."
                      : authMode ===
                          "signin"
                        ? "로그인"
                        : "회원가입"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      {user && (
        <div className="border-b border-emerald-100 bg-emerald-50">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
            <p className="text-xs font-semibold text-emerald-700">
              클라우드 저장 사용 중
            </p>

            <p className="text-xs text-emerald-700">
              <SyncLabel
                status={
                  syncStatus
                }
              />
            </p>
          </div>
        </div>
      )}

      {viewMode ===
      "dashboard" ? (
        /*
         * Dashboard
         */
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1 sm:hidden">
            <button
              onClick={() =>
                setViewMode(
                  "dashboard"
                )
              }
              className="flex-1 rounded-lg bg-white py-2 text-sm font-bold shadow-sm"
            >
              대시보드
            </button>

            <button
              onClick={() =>
                setViewMode(
                  "editor"
                )
              }
              className="flex-1 py-2 text-sm font-bold text-slate-500"
            >
              과목 편집
            </button>
          </div>

          {/* 학기 */}

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-blue-600">
                  ACADEMIC TERM
                </p>

                <h2 className="mt-1 text-xl font-black">
                  학기 관리
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={
                    openQuickSetup
                  }
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700"
                >
                  빠른 설정
                </button>

                <button
                  onClick={() => {
                    setShowSemesterAdder(
                      !showSemesterAdder
                    );

                    setSemesterCopySourceId(
                      currentSemesterId
                    );
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  + 학기 추가
                </button>
              </div>
            </div>

            {showSemesterAdder && (
              <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
                <h3 className="font-black">
                  새 학기 만들기
                </h3>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">
                    학기
                  </span>

                  <select
                    value={
                      semesterChoice
                    }
                    onChange={(e) =>
                      setSemesterChoice(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold"
                  >
                    {SEMESTER_PRESETS.map(
                      (semester) => (
                        <option
                          key={
                            semester
                          }
                          value={
                            semester
                          }
                        >
                          {semester}
                        </option>
                      )
                    )}

                    <option
                      value={
                        CUSTOM_VALUE
                      }
                    >
                      직접 입력
                    </option>
                  </select>
                </label>

                {semesterChoice ===
                  CUSTOM_VALUE && (
                  <input
                    value={
                      customSemesterName
                    }
                    onChange={(e) =>
                      setCustomSemesterName(
                        e.target.value
                      )
                    }
                    placeholder="학기 이름 직접 입력"
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold"
                  />
                )}

                <div className="mt-6">
                  <span className="text-sm font-semibold text-slate-600">
                    시작 방법
                  </span>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() =>
                        setSemesterCreateMode(
                          "new"
                        )
                      }
                      className={`rounded-2xl border p-4 text-left ${
                        semesterCreateMode ===
                        "new"
                          ? "border-blue-500 bg-white ring-2 ring-blue-100"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="font-bold">
                        새로 시작
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        첫 과목부터 새로 설정합니다.
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        setSemesterCreateMode(
                          "copy"
                        )
                      }
                      className={`rounded-2xl border p-4 text-left ${
                        semesterCreateMode ===
                        "copy"
                          ? "border-blue-500 bg-white ring-2 ring-blue-100"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="font-bold">
                        기존 학기 복사
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        과목과 평가 구조를 복사합니다.
                      </p>
                    </button>
                  </div>
                </div>

                {semesterCreateMode ===
                  "new" && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold text-slate-600">
                      첫 과목
                    </p>

                    <SubjectPresetSelect
                      value={
                        semesterFirstSubjectChoice
                      }
                      onChange={
                        setSemesterFirstSubjectChoice
                      }
                    />

                    {semesterFirstSubjectChoice ===
                      CUSTOM_VALUE && (
                      <input
                        value={
                          customSemesterFirstSubject
                        }
                        onChange={(e) =>
                          setCustomSemesterFirstSubject(
                            e.target.value
                          )
                        }
                        placeholder="과목 직접 입력"
                        className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3"
                      />
                    )}
                  </div>
                )}

                {semesterCreateMode ===
                  "copy" && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold text-slate-600">
                      복사할 학기
                    </p>

                    <select
                      value={
                        semesterCopySourceId
                      }
                      onChange={(e) =>
                        setSemesterCopySourceId(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold"
                    >
                      {semesters.map(
                        (semester) => (
                          <option
                            key={
                              semester.id
                            }
                            value={
                              semester.id
                            }
                          >
                            {
                              semester.name
                            }{" "}
                            (
                            {
                              semester
                                .subjects
                                .length
                            }
                            개 과목)
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={
                      addSemesterFromSelection
                    }
                    className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white"
                  >
                    학기 만들기
                  </button>

                  <button
                    onClick={() =>
                      setShowSemesterAdder(
                        false
                      )
                    }
                    className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-500 ring-1 ring-slate-200"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {semesters.map(
                (semester) => (
                  <button
                    key={
                      semester.id
                    }
                    onClick={() =>
                      switchSemester(
                        semester.id
                      )
                    }
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                      semester.id ===
                      currentSemesterId
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {
                      semester.name
                    }
                  </button>
                )
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={
                  currentSemester.name
                }
                onChange={(e) =>
                  updateCurrentSemester(
                    {
                      name:
                        e.target.value,
                    }
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-3 font-semibold"
              />

              <button
                onClick={
                  removeSemester
                }
                className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600"
              >
                학기 삭제
              </button>
            </div>
          </section>

          <header className="mb-7 mt-8">
            <p className="text-sm font-bold text-blue-600">
              MY GRADE DASHBOARD
            </p>

            <h1 className="mt-1 text-3xl font-black">
              {
                currentSemester.name
              }
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              과목별 목표와 필요한 점수를 확인합니다.
            </p>
          </header>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="전체 과목"
              value={`${subjects.length}`}
              suffix="개"
            />

            <SummaryCard
              label="계산 가능"
              value={`${configuredCount}`}
              suffix="개"
            />

            <SummaryCard
              label="달성 가능"
              value={`${possibleCount}`}
              suffix="개"
            />

            <SummaryCard
              label="확인 필요"
              value={`${warningCount}`}
              suffix="개"
              warning={
                warningCount > 0
              }
            />
          </section>

          <section className="mt-4 rounded-3xl bg-blue-600 p-6 text-white">
            <p className="text-sm text-blue-100">
              평균 목표점수
            </p>

            <p className="mt-2 text-4xl font-black">
              {averageTarget.toFixed(
                1
              )}

              <span className="ml-1 text-base">
                점
              </span>
            </p>
          </section>

          {/* 과목 */}

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  내 과목
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  과목별 목표를 관리합니다.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowSubjectAdder(
                    !showSubjectAdder
                  )
                }
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                + 과목 추가
              </button>
            </div>

            {showSubjectAdder && (
              <div className="mb-5 rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100">
                <p className="font-bold">
                  새 과목
                </p>

                <div className="mt-3">
                  <SubjectPresetSelect
                    value={
                      subjectChoice
                    }
                    onChange={
                      setSubjectChoice
                    }
                  />
                </div>

                {subjectChoice ===
                  CUSTOM_VALUE && (
                  <input
                    value={
                      customSubjectName
                    }
                    onChange={(e) =>
                      setCustomSubjectName(
                        e.target.value
                      )
                    }
                    placeholder="과목 이름 직접 입력"
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                  />
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={
                      addSubjectFromSelection
                    }
                    className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white"
                  >
                    과목 추가
                  </button>

                  <button
                    onClick={() =>
                      setShowSubjectAdder(
                        false
                      )
                    }
                    className="rounded-xl bg-white px-4 py-3 text-slate-500"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {analyses.map(
                ({
                  subject,
                  analysis,
                }) => (
                  <SubjectCard
                    key={
                      subject.id
                    }
                    subject={
                      subject
                    }
                    analysis={
                      analysis
                    }
                    onOpen={() =>
                      openSubject(
                        subject.id
                      )
                    }
                  />
                )
              )}
            </div>
          </section>

          <footer className="py-10 text-center text-xs text-slate-400">
            {user
              ? "클라우드 자동 저장 활성화"
              : "로그인 전에는 현재 브라우저에 저장됩니다."}
          </footer>
        </div>
      ) : (
        /*
         * Editor
         */
        <div className="mx-auto max-w-3xl px-4 py-8">
          <button
            onClick={() =>
              setViewMode(
                "dashboard"
              )
            }
            className="mb-5 text-sm font-semibold text-slate-500 hover:text-blue-600"
          >
            ← 대시보드로
          </button>

          <header className="mb-7">
            <p className="text-sm font-bold text-blue-600">
              {
                currentSemester.name
              }
            </p>

            <h1 className="mt-1 text-3xl font-black">
              {
                currentSubject.name
              }
            </h1>
          </header>

          {/* 과목 선택 */}

          <section className="mb-6 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {subjects.map(
                (subject) => (
                  <button
                    key={
                      subject.id
                    }
                    onClick={() => {
                      setCurrentSubjectId(
                        subject.id
                      );

                      setPreviewScore(
                        90
                      );

                      setResult(
                        null
                      );
                    }}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                      subject.id ===
                      currentSubjectId
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {
                      subject.name
                    }
                  </button>
                )
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={
                  currentSubject.name
                }
                onChange={(e) =>
                  updateCurrentSubject(
                    {
                      name:
                        e.target.value,
                    }
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-3 font-semibold"
              />

              <button
                onClick={
                  removeSubject
                }
                className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600"
              >
                과목 삭제
              </button>
            </div>
          </section>

          {/* 목표 */}

          <section className="mb-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <div className="flex justify-between gap-5">
              <div>
                <p className="text-sm font-bold text-blue-600">
                  STEP 1
                </p>

                <h2 className="mt-1 text-xl font-black">
                  목표 성적
                </h2>
              </div>

              <div className="w-32">
                <NumberInput
                  value={
                    targetFinalScore
                  }
                  onChange={(value) =>
                    updateCurrentSubject(
                      {
                        targetFinalScore:
                          value,
                      }
                    )
                  }
                  suffix="점"
                />
              </div>
            </div>
          </section>

          {/* 평가 빠른 설정 */}

          <section className="mb-6 rounded-3xl border border-blue-100 bg-blue-50/60 p-6">
            <p className="text-sm font-bold text-blue-600">
              QUICK SETUP
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              평가 구성 빠른 설정
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              학교의 평가 구조와 가장 비슷한 형태를 선택한 뒤
              세부 비율을 직접 수정할 수 있습니다.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={
                  assessmentPresetChoice
                }
                onChange={(e) =>
                  setAssessmentPresetChoice(
                    e.target
                      .value as AssessmentPresetId
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800"
              >
                {ASSESSMENT_PRESETS.map(
                  (preset) => (
                    <option
                      key={
                        preset.id
                      }
                      value={
                        preset.id
                      }
                    >
                      {preset.name} ·{" "}
                      {
                        preset.description
                      }
                    </option>
                  )
                )}
              </select>

              <button
                onClick={
                  applyAssessmentPreset
                }
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
              >
                이 구성 적용
              </button>
            </div>

            <div className="mt-6 border-t border-blue-100 pt-5">
              <p className="text-sm font-bold text-slate-700">
                평가 빠르게 추가
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <QuickAddButton
                  label="+ 중간고사"
                  onClick={() =>
                    addQuickAssessment(
                      "midterm"
                    )
                  }
                />

                <QuickAddButton
                  label="+ 기말고사"
                  onClick={() =>
                    addQuickAssessment(
                      "final"
                    )
                  }
                />

                <QuickAddButton
                  label="+ 수행평가"
                  onClick={() =>
                    addQuickAssessment(
                      "performance"
                    )
                  }
                />

                <QuickAddButton
                  label="+ 기타 평가"
                  onClick={() =>
                    addQuickAssessment(
                      "other"
                    )
                  }
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                새 평가를 추가하면 기본 반영비율은 10%로 설정됩니다.
                아래에서 실제 학교 반영비율에 맞게 수정하세요.
              </p>
            </div>
          </section>

          {/* 평가 상세 */}

          <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600">
                  STEP 2
                </p>

                <h2 className="mt-1 text-xl font-black">
                  평가 상세 설정
                </h2>
              </div>

              <button
                onClick={
                  addAssessment
                }
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold"
              >
                + 평가 추가
              </button>
            </div>

            <div className="space-y-4">
              {assessments.map(
                (item) => {
                  const isTarget =
                    item.id ===
                    targetAssessmentId;

                  return (
                    <div
                      key={
                        item.id
                      }
                      className={`rounded-2xl border p-4 ${
                        isTarget
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="mb-4 flex justify-between gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="target-assessment"
                            checked={
                              isTarget
                            }
                            onChange={() =>
                              selectTargetAssessment(
                                item.id
                              )
                            }
                            className="accent-blue-600"
                          />

                          <span className="text-sm font-semibold">
                            {isTarget
                              ? "목표 계산 대상"
                              : "계산 대상으로 선택"}
                          </span>
                        </label>

                        <button
                          onClick={() =>
                            removeAssessment(
                              item.id
                            )
                          }
                          className="text-sm text-red-500"
                        >
                          삭제
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextInput
                          label="평가 이름"
                          value={
                            item.name
                          }
                          onChange={(value) =>
                            updateAssessment(
                              item.id,
                              {
                                name:
                                  value,
                              }
                            )
                          }
                        />

                        <label>
                          <span className="mb-2 block text-sm text-slate-600">
                            평가 종류
                          </span>

                          <select
                            value={
                              item.type
                            }
                            onChange={(e) =>
                              updateAssessment(
                                item.id,
                                {
                                  type:
                                    e.target
                                      .value as AssessmentType,
                                }
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3"
                          >
                            <option value="written">
                              지필평가
                            </option>

                            <option value="performance">
                              수행평가
                            </option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div>
                          <span className="mb-2 block text-sm text-slate-600">
                            받은 점수
                          </span>

                          {isTarget ? (
                            <div className="flex min-h-[50px] items-center rounded-xl bg-blue-100 px-3 py-3 text-sm font-bold text-blue-700">
                              자동 계산
                            </div>
                          ) : (
                            <NullableNumberInput
                              value={
                                item.score
                              }
                              onChange={(value) =>
                                updateAssessment(
                                  item.id,
                                  {
                                    score:
                                      value,
                                  }
                                )
                              }
                              suffix="점"
                            />
                          )}
                        </div>

                        <div>
                          <span className="mb-2 block text-sm text-slate-600">
                            만점
                          </span>

                          <NumberInput
                            value={
                              item.maxScore
                            }
                            onChange={(value) =>
                              updateAssessment(
                                item.id,
                                {
                                  maxScore:
                                    value,
                                }
                              )
                            }
                            suffix="점"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <span className="mb-2 block text-sm text-slate-600">
                            반영비율
                          </span>

                          <NumberInput
                            value={
                              item.weight
                            }
                            onChange={(value) =>
                              updateAssessment(
                                item.id,
                                {
                                  weight:
                                    value,
                                }
                              )
                            }
                            suffix="%"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div
              className={`mt-5 flex items-center justify-between rounded-2xl p-4 ${
                Math.abs(
                  totalWeight - 100
                ) <= 0.01
                  ? "bg-emerald-50"
                  : "bg-amber-50"
              }`}
            >
              <div>
                <p className="font-semibold">
                  전체 반영비율
                </p>

                {Math.abs(
                  totalWeight - 100
                ) > 0.01 && (
                  <p className="mt-1 text-xs text-amber-700">
                    계산하려면 합계를 100%로 맞춰주세요.
                  </p>
                )}
              </div>

              <strong className="text-lg">
                {totalWeight}%
              </strong>
            </div>

            <button
              onClick={
                calculate
              }
              className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-bold text-white"
            >
              필요한 점수 계산
            </button>
          </section>

          {/* 결과 */}

          {result && (
            <section className="mt-6">
              {result.type ===
                "normal" &&
                targetAssessment && (
                  <div className="rounded-3xl bg-white p-7 text-center ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">
                      {
                        targetAssessment.name
                      }
                      에서
                    </p>

                    <p className="my-3 text-5xl font-black text-blue-600">
                      {result.requiredScore.toFixed(
                        1
                      )}
                      점
                    </p>

                    <p className="text-sm text-slate-500">
                      /{" "}
                      {
                        targetAssessment.maxScore
                      }
                      점 필요
                    </p>
                  </div>
                )}

              {result.type ===
                "already" && (
                  <div className="rounded-3xl bg-emerald-50 p-7 text-center font-bold text-emerald-700">
                    이미 목표점수를 확보했습니다.
                  </div>
                )}

              {result.type ===
                "impossible" && (
                  <div className="rounded-3xl bg-red-50 p-7 text-center text-red-700">
                    계산상{" "}
                    {result.requiredScore.toFixed(
                      1
                    )}
                    점이 필요합니다.
                  </div>
                )}

              {result.type ===
                "error" && (
                  <div className="rounded-3xl bg-amber-50 p-7 text-center text-amber-700">
                    {
                      result.message
                    }
                  </div>
                )}
            </section>
          )}

          {/* 시뮬레이션 */}

          {targetAssessment && (
            <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h2 className="text-xl font-black">
                {
                  targetAssessment.name
                }{" "}
                시뮬레이터
              </h2>

              <div className="mt-5 flex justify-between">
                <span>
                  예상 점수
                </span>

                <strong className="text-blue-600">
                  {
                    safePreviewScore
                  }
                  점
                </strong>
              </div>

              <input
                type="range"
                min="0"
                max={
                  targetAssessment.maxScore
                }
                value={
                  safePreviewScore
                }
                onChange={(e) =>
                  setPreviewScore(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="mt-4 w-full accent-blue-600"
              />

              {inputsValid && (
                <>
                  <div className="mt-7 text-center">
                    <p className="text-sm text-slate-500">
                      예상 최종점수
                    </p>

                    <p
                      className={`mt-2 text-5xl font-black ${
                        targetAchieved
                          ? "text-emerald-600"
                          : "text-slate-900"
                      }`}
                    >
                      {projectedFinalScore.toFixed(
                        1
                      )}
                      점
                    </p>

                    {targetAchieved ? (
                      <span className="mt-3 inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
                        목표 달성
                      </span>
                    ) : (
                      <p className="mt-3 text-sm">
                        목표까지{" "}
                        <strong className="text-blue-600">
                          {Math.max(
                            difference,
                            0
                          ).toFixed(1)}
                          점
                        </strong>{" "}
                        부족
                      </p>
                    )}
                  </div>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${
                        targetAchieved
                          ? "bg-emerald-500"
                          : "bg-blue-600"
                      }`}
                      style={{
                        width:
                          `${progress}%`,
                      }}
                    />
                  </div>
                </>
              )}
            </section>
          )}

          {/* 점수별 */}

          {targetAssessment &&
            inputsValid && (
              <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <h2 className="text-xl font-black">
                  점수별 결과
                </h2>

                <div className="mt-4 space-y-3">
                  {simulationScores.map(
                    (score) => {
                      const finalScore =
                        calculateFinalScore(
                          score
                        );

                      const achieved =
                        finalScore >=
                        targetFinalScore;

                      return (
                        <div
                          key={
                            score
                          }
                          className={`flex justify-between rounded-xl p-3 ${
                            achieved
                              ? "bg-blue-50"
                              : "bg-slate-50"
                          }`}
                        >
                          <span>
                            {score}점
                          </span>

                          <strong
                            className={
                              achieved
                                ? "text-blue-700"
                                : ""
                            }
                          >
                            최종{" "}
                            {finalScore.toFixed(
                              1
                            )}
                            점
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            )}

          <footer className="py-10 text-center text-xs text-slate-400">
            {
              currentSemester.name
            }{" "}
            · GradeGoal
          </footer>
        </div>
      )}
    </main>
  );
}

/*
 * Onboarding
 */

function OnboardingScreen({
  step,
  mode,
  semesterChoice,
  setSemesterChoice,
  customSemester,
  setCustomSemester,
  subjects,
  toggleSubject,
  customSubject,
  setCustomSubject,
  addCustomSubject,
  onBack,
  onNext,
  onFinish,
  onCancel,
}: {
  step: number;

  mode:
    OnboardingMode;

  semesterChoice:
    string;

  setSemesterChoice:
    (value: string) => void;

  customSemester:
    string;

  setCustomSemester:
    (value: string) => void;

  subjects:
    string[];

  toggleSubject:
    (name: string) => void;

  customSubject:
    string;

  setCustomSubject:
    (value: string) => void;

  addCustomSubject:
    () => void;

  onBack:
    () => void;

  onNext:
    () => void;

  onFinish:
    () => void;

  onCancel:
    () => void;
}) {
  const semesterName =
    semesterChoice ===
    CUSTOM_VALUE
      ? customSemester
      : semesterChoice;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <p className="text-xl font-black text-blue-600">
            GradeGoal
          </p>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">
            {mode ===
            "first"
              ? "성적 관리를 시작해볼까요?"
              : "학기 빠른 설정"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            처음 한 번만 설정하면 이후에는 입력한 정보를 자동으로
            저장합니다.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-2">
          {[1, 2, 3].map(
            (number) => (
              <div
                key={
                  number
                }
                className={`h-2 rounded-full ${
                  number <=
                  step
                    ? "bg-blue-600"
                    : "bg-slate-200"
                }`}
              />
            )
          )}
        </div>

        <p className="mt-3 text-center text-xs font-semibold text-slate-400">
          {step} / 3
        </p>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          {step ===
            1 && (
            <>
              <p className="text-sm font-bold text-blue-600">
                STEP 1
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                현재 학기를 선택하세요
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                목록에 없다면 직접 입력할 수도 있습니다.
              </p>

              <select
                value={
                  semesterChoice
                }
                onChange={(e) =>
                  setSemesterChoice(
                    e.target.value
                  )
                }
                className="mt-6 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-bold text-slate-800"
              >
                {SEMESTER_PRESETS.map(
                  (semester) => (
                    <option
                      key={
                        semester
                      }
                      value={
                        semester
                      }
                    >
                      {
                        semester
                      }
                    </option>
                  )
                )}

                <option
                  value={
                    CUSTOM_VALUE
                  }
                >
                  직접 입력
                </option>
              </select>

              {semesterChoice ===
                CUSTOM_VALUE && (
                <input
                  value={
                    customSemester
                  }
                  onChange={(e) =>
                    setCustomSemester(
                      e.target.value
                    )
                  }
                  placeholder="예: 2026학년도 2학기"
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-4 font-semibold"
                />
              )}
            </>
          )}

          {step ===
            2 && (
            <>
              <p className="text-sm font-bold text-blue-600">
                STEP 2
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                듣고 있는 과목을 선택하세요
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                여러 과목을 한 번에 선택할 수 있습니다.
              </p>

              <div className="mt-6 space-y-6">
                {SUBJECT_GROUPS.map(
                  (group) => (
                    <div
                      key={
                        group.label
                      }
                    >
                      <p className="mb-3 text-sm font-black text-slate-700">
                        {
                          group.label
                        }
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {group.subjects.map(
                          (subject) => {
                            const selected =
                              subjects.includes(
                                subject
                              );

                            return (
                              <button
                                type="button"
                                key={
                                  subject
                                }
                                onClick={() =>
                                  toggleSubject(
                                    subject
                                  )
                                }
                                className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
                                  selected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {selected
                                  ? "✓ "
                                  : ""}
                                {
                                  subject
                                }
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">
                  과목 직접 입력
                </p>

                <div className="mt-3 flex gap-2">
                  <input
                    value={
                      customSubject
                    }
                    onChange={(e) =>
                      setCustomSubject(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        e.preventDefault();

                        addCustomSubject();
                      }
                    }}
                    placeholder="과목 이름"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3"
                  />

                  <button
                    type="button"
                    onClick={
                      addCustomSubject
                    }
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
                  >
                    추가
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-700">
                  선택한 과목{" "}
                  {
                    subjects.length
                  }
                  개
                </p>

                {subjects.length >
                  0 && (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {subjects.join(
                      " · "
                    )}
                  </p>
                )}
              </div>
            </>
          )}

          {step ===
            3 && (
            <>
              <p className="text-sm font-bold text-blue-600">
                STEP 3
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                설정을 확인하세요
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold text-slate-400">
                    학기
                  </p>

                  <p className="mt-2 text-lg font-black text-slate-900">
                    {
                      semesterName
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold text-slate-400">
                    과목
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {subjects.map(
                      (subject) => (
                        <span
                          key={
                            subject
                          }
                          className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200"
                        >
                          {
                            subject
                          }
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-800">
                  각 과목은 기본적으로{" "}
                  <strong>
                    중간 30% + 수행 40% + 기말 30%
                  </strong>
                  로 시작합니다. 과목 편집에서 다른 평가 구조를
                  빠르게 선택할 수 있습니다.
                </div>
              </div>
            </>
          )}

          <div className="mt-8 flex gap-3">
            {step >
            1 ? (
              <button
                type="button"
                onClick={
                  onBack
                }
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold text-slate-600"
              >
                이전
              </button>
            ) : mode ===
              "edit" ? (
              <button
                type="button"
                onClick={
                  onCancel
                }
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold text-slate-600"
              >
                취소
              </button>
            ) : null}

            {step <
            3 ? (
              <button
                type="button"
                onClick={
                  onNext
                }
                className="flex-1 rounded-2xl bg-blue-600 py-4 font-black text-white"
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  onFinish
                }
                className="flex-1 rounded-2xl bg-blue-600 py-4 font-black text-white"
              >
                {mode ===
                "first"
                  ? "GradeGoal 시작"
                  : "설정 저장"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/*
 * UI Components
 */

function SyncLabel({
  status,
}: {
  status: SyncStatus;
}) {
  const labels: Record<
    SyncStatus,
    string
  > = {
    local:
      "이 기기에 저장",

    syncing:
      "클라우드 불러오는 중...",

    saving:
      "클라우드 저장 중...",

    synced:
      "클라우드 저장 완료",

    error:
      "동기화 오류",
  };

  return (
    <>
      {labels[status]}
    </>
  );
}

function SubjectPresetSelect({
  value,
  onChange,
}: {
  value: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <select
      value={
        value
      }
      onChange={(e) =>
        onChange(
          e.target.value
        )
      }
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold"
    >
      {SUBJECT_GROUPS.map(
        (group) => (
          <optgroup
            key={
              group.label
            }
            label={
              group.label
            }
          >
            {group.subjects.map(
              (subject) => (
                <option
                  key={
                    subject
                  }
                  value={
                    subject
                  }
                >
                  {
                    subject
                  }
                </option>
              )
            )}
          </optgroup>
        )
      )}

      <option
        value={
          CUSTOM_VALUE
        }
      >
        직접 입력
      </option>
    </select>
  );
}

function QuickAddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
    >
      {label}
    </button>
  );
}

function SubjectCard({
  subject,
  analysis,
  onOpen,
}: {
  subject: Subject;

  analysis:
    SubjectAnalysis;

  onOpen:
    () => void;
}) {
  return (
    <button
      onClick={
        onOpen
      }
      className="w-full rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black">
            {
              subject.name
            }
          </p>

          <p className="mt-1 text-sm text-slate-500">
            목표{" "}
            {
              subject.targetFinalScore
            }
            점
          </p>
        </div>

        <StatusBadge
          analysis={
            analysis
          }
        />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        {analysis.status ===
          "normal" && (
          <>
            <p className="text-xs text-slate-400">
              필요한 점수
            </p>

            <p className="mt-1 text-2xl font-black text-blue-600">
              {analysis.requiredScore.toFixed(
                1
              )}

              <span className="ml-1 text-sm font-semibold text-slate-500">
                /{" "}
                {
                  analysis.targetMax
                }
                점
              </span>
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {
                analysis.targetName
              }{" "}
              · 만점 대비{" "}
              {analysis.requiredPercent.toFixed(
                1
              )}
              %
            </p>
          </>
        )}

        {analysis.status ===
          "already" && (
          <p className="font-bold text-emerald-600">
            목표 확보
          </p>
        )}

        {analysis.status ===
          "impossible" && (
          <>
            <p className="font-bold text-red-600">
              목표 조정 필요
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {
                analysis.targetName
              }
              에서{" "}
              {analysis.requiredScore.toFixed(
                1
              )}
              점 필요
            </p>
          </>
        )}

        {analysis.status ===
          "invalid" && (
          <>
            <p className="font-bold text-amber-600">
              설정 확인 필요
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {
                analysis.message
              }
            </p>
          </>
        )}
      </div>

      <p className="mt-5 text-sm font-bold text-blue-600">
        과목 편집 →
      </p>
    </button>
  );
}

function StatusBadge({
  analysis,
}: {
  analysis:
    SubjectAnalysis;
}) {
  const styles = {
    normal:
      "bg-blue-50 text-blue-700",

    already:
      "bg-emerald-50 text-emerald-700",

    impossible:
      "bg-red-50 text-red-700",

    invalid:
      "bg-amber-50 text-amber-700",
  };

  const labels = {
    normal:
      "계산 완료",

    already:
      "목표 확보",

    impossible:
      "위험",

    invalid:
      "설정 필요",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[
          analysis.status
        ]
      }`}
    >
      {
        labels[
          analysis.status
        ]
      }
    </span>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  warning = false,
}: {
  label:
    string;

  value:
    string;

  suffix:
    string;

  warning?:
    boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          warning
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {value}

        <span className="ml-1 text-xs font-normal text-slate-400">
          {suffix}
        </span>
      </p>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
}: {
  value:
    number;

  onChange:
    (value: number) => void;

  suffix:
    string;
}) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <input
        type="number"
        value={
          value
        }
        onChange={(e) =>
          onChange(
            Number(
              e.target.value
            )
          )
        }
        className="min-w-0 flex-1 bg-transparent py-3 font-semibold outline-none"
      />

      <span className="self-center text-sm text-slate-400">
        {suffix}
      </span>
    </div>
  );
}

function NullableNumberInput({
  value,
  onChange,
  suffix,
}: {
  value:
    number | null;

  onChange:
    (
      value:
        number | null
    ) => void;

  suffix:
    string;
}) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <input
        type="number"
        value={
          value ?? ""
        }
        placeholder="미입력"
        onChange={(e) => {
          const text =
            e.target.value;

          if (
            text === ""
          ) {
            onChange(
              null
            );

            return;
          }

          onChange(
            Number(text)
          );
        }}
        className="min-w-0 flex-1 bg-transparent py-3 font-semibold outline-none"
      />

      <span className="self-center text-sm text-slate-400">
        {suffix}
      </span>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label:
    string;

  value:
    string;

  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-600">
        {label}
      </span>

      <input
        value={
          value
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}