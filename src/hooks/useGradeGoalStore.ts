"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  User,
} from "@supabase/supabase-js";

import {
  CLOUD_SAVE_DELAY_MS,
  OLD_STORAGE_KEYS,
  OLD_V1,
  STORAGE_KEY,
} from "../lib/gradegoal/constants";

import {
  cloneSubjectTemplate,
  createAssessmentsFromPreset,
  createSemester,
  createSubject,
  normalizePayload,
  normalizeSubject,
} from "../lib/gradegoal/calculations";

import type {
  AssessmentPresetId,
  AssessmentType,
  CloudPayload,
  OnboardingMode,
  Semester,
  Subject,
  SyncStatus,
  ViewMode,
} from "../lib/gradegoal/types";

import {
  supabase,
} from "../lib/supabase";

type NormalizedPayload =
  NonNullable<
    ReturnType<
      typeof normalizePayload
    >
  >;

type OnboardingResult = {
  semesterName: string;
  subjectNames: string[];
};

const DATA_VERSION = 8;

function buildPayload(
  semesters: Semester[],
  currentSemesterId: string,
  currentSubjectId: string,
  onboardingCompleted: boolean
): CloudPayload {
  return {
    version: DATA_VERSION,
    semesters,
    currentSemesterId,
    currentSubjectId,
    onboardingCompleted,
  };
}

function clearGradeGoalLocalStorage() {
  localStorage.removeItem(
    STORAGE_KEY
  );

  for (
    const key of
    OLD_STORAGE_KEYS
  ) {
    localStorage.removeItem(
      key
    );
  }

  localStorage.removeItem(
    OLD_V1
  );
}

function readLocalPayload():
  | NormalizedPayload
  | null {
  const keys = [
    STORAGE_KEY,
    ...OLD_STORAGE_KEYS,
  ];

  for (
    const key of keys
  ) {
    try {
      const saved =
        localStorage.getItem(
          key
        );

      if (!saved) {
        continue;
      }

      const parsed =
        JSON.parse(
          saved
        ) as Partial<CloudPayload>;

      if (
        !Array.isArray(
          parsed.semesters
        ) ||
        parsed.semesters.length ===
          0
      ) {
        continue;
      }

      const normalized =
        normalizePayload({
          version:
            parsed.version ??
            1,

          semesters:
            parsed.semesters,

          currentSemesterId:
            parsed.currentSemesterId ??
            "",

          currentSubjectId:
            parsed.currentSubjectId ??
            "",

          onboardingCompleted:
            parsed.onboardingCompleted,
        });

      if (normalized) {
        return normalized;
      }
    } catch (error) {
      console.error(
        `GradeGoal localStorage load error: ${key}`,
        error
      );
    }
  }

  /*
   * Legacy v1 migration
   */
  try {
    const savedV1 =
      localStorage.getItem(
        OLD_V1
      );

    if (!savedV1) {
      return null;
    }

    const old =
      JSON.parse(
        savedV1
      ) as {
        semesterName?: string;
        currentSubjectId?: string;
        subjects?: Subject[];
      };

    if (
      !Array.isArray(
        old.subjects
      ) ||
      old.subjects.length ===
        0
    ) {
      return null;
    }

    const semester =
      createSemester(
        old.semesterName ||
          "1학년 1학기",
        "수학"
      );

    semester.subjects =
      old.subjects.map(
        normalizeSubject
      );

    const subject =
      semester.subjects.find(
        (item) =>
          item.id ===
          old.currentSubjectId
      ) ??
      semester.subjects[0];

    return {
      semesters: [
        semester,
      ],

      currentSemesterId:
        semester.id,

      currentSubjectId:
        subject.id,

      onboardingCompleted:
        true,
    };
  } catch (error) {
    console.error(
      "GradeGoal legacy localStorage load error",
      error
    );

    return null;
  }
}

export function useGradeGoalStore() {
  const [
    semesters,
    setSemesters,
  ] =
    useState<Semester[]>(
      []
    );

  const [
    currentSemesterId,
    setCurrentSemesterId,
  ] =
    useState("");

  const [
    currentSubjectId,
    setCurrentSubjectId,
  ] =
    useState("");

  const [
    onboardingCompleted,
    setOnboardingCompleted,
  ] =
    useState(false);

  const [
    onboardingOpen,
    setOnboardingOpen,
  ] =
    useState(false);

  const [
    onboardingMode,
    setOnboardingMode,
  ] =
    useState<OnboardingMode>(
      "first"
    );

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      "dashboard"
    );

  const [
    hydrated,
    setHydrated,
  ] =
    useState(false);

  const [
    authReady,
    setAuthReady,
  ] =
    useState(false);

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    cloudReady,
    setCloudReady,
  ] =
    useState(false);

  const [
    syncStatus,
    setSyncStatus,
  ] =
    useState<SyncStatus>(
      "local"
    );

  /*
   * 마지막으로 Cloud에 성공적으로 저장된
   * JSON 문자열입니다.
   *
   * 동일한 데이터라면 Supabase 요청을
   * 보내지 않습니다.
   */
  const lastCloudSerializedRef =
    useRef<string | null>(
      null
    );

  /*
   * 현재 로컬 상태의 최신 snapshot.
   *
   * 신규 계정의 최초 Cloud 업로드에 사용합니다.
   */
  const localSnapshotRef =
    useRef<CloudPayload | null>(
      null
    );

  /*
   * 동일 사용자의 Cloud 데이터를
   * 여러 번 초기 로드하지 않도록 합니다.
   */
  const loadedUserRef =
    useRef<string | null>(
      null
    );

  const currentSemester =
    useMemo(
      () =>
        semesters.find(
          (semester) =>
            semester.id ===
            currentSemesterId
        ) ??
        semesters[0] ??
        null,
      [
        semesters,
        currentSemesterId,
      ]
    );

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
    useMemo(
      () =>
        subjects.find(
          (subject) =>
            subject.id ===
            currentSubjectId
        ) ??
        subjects[0] ??
        null,
      [
        subjects,
        currentSubjectId,
      ]
    );

  const applyNormalizedPayload =
    useCallback(
      (
        normalized:
          NormalizedPayload
      ) => {
        setSemesters(
          normalized.semesters
        );

        setCurrentSemesterId(
          normalized.currentSemesterId
        );

        setCurrentSubjectId(
          normalized.currentSubjectId
        );

        setOnboardingCompleted(
          normalized.onboardingCompleted
        );

        if (
          normalized.onboardingCompleted
        ) {
          setOnboardingOpen(
            false
          );
        } else {
          setOnboardingMode(
            "first"
          );

          setOnboardingOpen(
            true
          );
        }

        setViewMode(
          "dashboard"
        );
      },
      []
    );

  const createFreshState =
    useCallback(() => {
      const semester =
        createSemester(
          "1학년 1학기",
          "수학"
        );

      const payload =
        buildPayload(
          [semester],
          semester.id,
          semester.subjects[0].id,
          false
        );

      localSnapshotRef.current =
        payload;

      setSemesters([
        semester,
      ]);

      setCurrentSemesterId(
        semester.id
      );

      setCurrentSubjectId(
        semester.subjects[0].id
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

      setViewMode(
        "dashboard"
      );

      return payload;
    }, []);

  /*
   * =========================================================
   * 1. localStorage initial hydration
   * =========================================================
   */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          const normalized =
            readLocalPayload();

          if (normalized) {
            const payload =
              buildPayload(
                normalized.semesters,
                normalized.currentSemesterId,
                normalized.currentSubjectId,
                normalized.onboardingCompleted
              );

            localSnapshotRef.current =
              payload;

            applyNormalizedPayload(
              normalized
            );
          } else {
            createFreshState();
          }

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
  }, [
    applyNormalizedPayload,
    createFreshState,
  ]);

  /*
   * =========================================================
   * 2. Supabase Auth subscription
   * =========================================================
   */

  useEffect(() => {
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

          setAuthReady(
            true
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

            lastCloudSerializedRef.current =
              null;
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * =========================================================
   * 3. localStorage persistence
   * =========================================================
   */

  useEffect(() => {
    if (
      !hydrated ||
      semesters.length === 0
    ) {
      return;
    }

    const payload =
      buildPayload(
        semesters,
        currentSemesterId,
        currentSubjectId,
        onboardingCompleted
      );

    localSnapshotRef.current =
      payload;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          payload
        )
      );
    } catch (error) {
      console.error(
        "GradeGoal local save error",
        error
      );
    }
  }, [
    semesters,
    currentSemesterId,
    currentSubjectId,
    onboardingCompleted,
    hydrated,
  ]);

  /*
   * =========================================================
   * 4. Initial Cloud sync
   * =========================================================
   */

  useEffect(() => {
    if (
      !hydrated ||
      !authReady ||
      !user
    ) {
      return;
    }

    if (
      loadedUserRef.current ===
      user.id
    ) {
      return;
    }

    loadedUserRef.current =
      user.id;

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        () => {
          void (async () => {
            setCloudReady(
              false
            );

            setSyncStatus(
              "syncing"
            );

            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "gradegoal_data"
                )
                .select(
                  "data"
                )
                .eq(
                  "user_id",
                  user.id
                )
                .maybeSingle();

            if (cancelled) {
              return;
            }

            if (error) {
              console.error(
                "GradeGoal cloud load error",
                error
              );

              setSyncStatus(
                "error"
              );

              loadedUserRef.current =
                null;

              return;
            }

            if (
              data?.data
            ) {
              const normalized =
                normalizePayload(
                  data.data as unknown as CloudPayload
                );

              if (
                normalized
              ) {
                const payload =
                  buildPayload(
                    normalized.semesters,
                    normalized.currentSemesterId,
                    normalized.currentSubjectId,
                    normalized.onboardingCompleted
                  );

                lastCloudSerializedRef.current =
                  JSON.stringify(
                    payload
                  );

                localSnapshotRef.current =
                  payload;

                applyNormalizedPayload(
                  normalized
                );

                setCloudReady(
                  true
                );

                setSyncStatus(
                  "synced"
                );

                return;
              }
            }

            /*
             * Cloud row does not exist:
             * upload current local state once.
             */
            const localPayload =
              localSnapshotRef.current;

            if (
              !localPayload
            ) {
              setSyncStatus(
                "error"
              );

              loadedUserRef.current =
                null;

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
                      user.id,

                    data:
                      localPayload,
                  },
                  {
                    onConflict:
                      "user_id",
                  }
                );

            if (cancelled) {
              return;
            }

            if (
              uploadError
            ) {
              console.error(
                "GradeGoal initial cloud upload error",
                uploadError
              );

              setSyncStatus(
                "error"
              );

              loadedUserRef.current =
                null;

              return;
            }

            lastCloudSerializedRef.current =
              JSON.stringify(
                localPayload
              );

            setCloudReady(
              true
            );

            setSyncStatus(
              "synced"
            );
          })();
        },
        0
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    hydrated,
    authReady,
    user,
    applyNormalizedPayload,
  ]);

  /*
   * =========================================================
   * 5. Deduplicated Cloud autosave
   * =========================================================
   */

  useEffect(() => {
    if (
      !hydrated ||
      !cloudReady ||
      !user ||
      semesters.length === 0
    ) {
      return;
    }

    const payload =
      buildPayload(
        semesters,
        currentSemesterId,
        currentSubjectId,
        onboardingCompleted
      );

    const serialized =
      JSON.stringify(
        payload
      );

    if (
      serialized ===
      lastCloudSerializedRef.current
    ) {
      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        () => {
          void (async () => {
            setSyncStatus(
              "saving"
            );

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
                      user.id,

                    data:
                      payload,
                  },
                  {
                    onConflict:
                      "user_id",
                  }
                );

            if (cancelled) {
              return;
            }

            if (error) {
              console.error(
                "GradeGoal cloud save error",
                error
              );

              setSyncStatus(
                "error"
              );

              return;
            }

            lastCloudSerializedRef.current =
              serialized;

            setSyncStatus(
              "synced"
            );
          })();
        },
        CLOUD_SAVE_DELAY_MS
      );

    return () => {
      cancelled =
        true;

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
    user,
  ]);

  /*
   * =========================================================
   * Semester actions
   * =========================================================
   */

  const selectSemester =
    useCallback(
      (
        semesterId: string
      ) => {
        const semester =
          semesters.find(
            (item) =>
              item.id ===
              semesterId
          );

        if (!semester) {
          return;
        }

        setCurrentSemesterId(
          semester.id
        );

        setCurrentSubjectId(
          semester.subjects[0]
            ?.id ?? ""
        );

        setViewMode(
          "dashboard"
        );
      },
      [
        semesters,
      ]
    );

  const addSemester =
    useCallback(
      (
        name: string,
        copyFromSemesterId?:
          string
      ) => {
        const trimmed =
          name.trim();

        if (!trimmed) {
          return;
        }

        let nextSemester:
          Semester;

        const source =
          copyFromSemesterId
            ? semesters.find(
                (semester) =>
                  semester.id ===
                  copyFromSemesterId
              )
            : null;

        if (
          source &&
          source.subjects.length >
            0
        ) {
          nextSemester = {
            id:
              crypto.randomUUID(),

            name:
              trimmed,

            subjects:
              source.subjects.map(
                cloneSubjectTemplate
              ),
          };
        } else {
          nextSemester =
            createSemester(
              trimmed,
              "수학"
            );
        }

        setSemesters(
          (current) => [
            ...current,
            nextSemester,
          ]
        );

        setCurrentSemesterId(
          nextSemester.id
        );

        setCurrentSubjectId(
          nextSemester.subjects[0]
            ?.id ?? ""
        );

        setViewMode(
          "dashboard"
        );
      },
      [
        semesters,
      ]
    );

  /*
   * =========================================================
   * Subject actions
   * =========================================================
   */

  const selectSubject =
    useCallback(
      (
        subjectId: string
      ) => {
        setCurrentSubjectId(
          subjectId
        );

        setViewMode(
          "editor"
        );
      },
      []
    );

  const addSubject =
    useCallback(
      (
        name: string
      ) => {
        const trimmed =
          name.trim();

        if (
          !trimmed ||
          !currentSemester
        ) {
          return;
        }

        const subject =
          createSubject(
            trimmed
          );

        setSemesters(
          (current) =>
            current.map(
              (semester) =>
                semester.id ===
                currentSemester.id
                  ? {
                      ...semester,

                      subjects: [
                        ...semester.subjects,
                        subject,
                      ],
                    }
                  : semester
            )
        );

        setCurrentSubjectId(
          subject.id
        );

        setViewMode(
          "editor"
        );
      },
      [
        currentSemester,
      ]
    );

  const updateSubject =
    useCallback(
      (
        subject: Subject
      ) => {
        if (!currentSemester) {
          return;
        }

        setSemesters(
          (current) =>
            current.map(
              (semester) =>
                semester.id ===
                currentSemester.id
                  ? {
                      ...semester,

                      subjects:
                        semester.subjects.map(
                          (item) =>
                            item.id ===
                            subject.id
                              ? subject
                              : item
                        ),
                    }
                  : semester
            )
        );
      },
      [
        currentSemester,
      ]
    );

  const deleteSubject =
    useCallback(
      (
        subjectId: string
      ) => {
        if (!currentSemester) {
          return;
        }

        const nextSubjects =
          currentSemester.subjects.filter(
            (subject) =>
              subject.id !==
              subjectId
          );

        setSemesters(
          (current) =>
            current.map(
              (semester) =>
                semester.id ===
                currentSemester.id
                  ? {
                      ...semester,
                      subjects:
                        nextSubjects,
                    }
                  : semester
            )
        );

        setCurrentSubjectId(
          nextSubjects[0]?.id ??
            ""
        );

        setViewMode(
          "dashboard"
        );
      },
      [
        currentSemester,
      ]
    );

  /*
   * =========================================================
   * Assessment actions
   * =========================================================
   */

  const applyAssessmentPreset =
    useCallback(
      (
        presetId:
          AssessmentPresetId
      ) => {
        if (!currentSubject) {
          return;
        }

        const preset =
          createAssessmentsFromPreset(
            presetId
          );

        updateSubject({
          ...currentSubject,

          assessments:
            preset.assessments,

          targetAssessmentId:
            preset.targetAssessmentId,
        });
      },
      [
        currentSubject,
        updateSubject,
      ]
    );

  const addAssessment =
    useCallback(
      (
        type:
          AssessmentType,
        name: string
      ) => {
        if (!currentSubject) {
          return;
        }

        const nextId =
          currentSubject.assessments.reduce(
            (
              highest,
              assessment
            ) =>
              Math.max(
                highest,
                assessment.id
              ),
            0
          ) + 1;

        updateSubject({
          ...currentSubject,

          assessments: [
            ...currentSubject.assessments,

            {
              id:
                nextId,

              name,

              type,

              score:
                null,

              maxScore:
                100,

              weight:
                0,
            },
          ],
        });
      },
      [
        currentSubject,
        updateSubject,
      ]
    );

  /*
   * =========================================================
   * Onboarding / quick setup
   * =========================================================
   */

  const openQuickSetup =
    useCallback(() => {
      setOnboardingMode(
        "edit"
      );

      setOnboardingOpen(
        true
      );
    }, []);

  const closeQuickSetup =
    useCallback(() => {
      if (
        onboardingCompleted
      ) {
        setOnboardingOpen(
          false
        );
      }
    }, [
      onboardingCompleted,
    ]);

  const applyOnboarding =
    useCallback(
      ({
        semesterName,
        subjectNames,
      }: OnboardingResult) => {
        const uniqueNames =
          Array.from(
            new Set(
              subjectNames
                .map(
                  (name) =>
                    name.trim()
                )
                .filter(
                  Boolean
                )
            )
          );

        if (
          !semesterName.trim() ||
          uniqueNames.length ===
            0
        ) {
          return;
        }

        /*
         * Quick setup:
         * keep existing subjects with matching names,
         * create only new subjects.
         */
        if (
          onboardingMode ===
            "edit" &&
          currentSemester
        ) {
          const nextSubjects =
            uniqueNames.map(
              (name) =>
                currentSemester.subjects.find(
                  (subject) =>
                    subject.name ===
                    name
                ) ??
                createSubject(
                  name
                )
            );

          const nextSemester: Semester =
            {
              ...currentSemester,

              name:
                semesterName.trim(),

              subjects:
                nextSubjects,
            };

          setSemesters(
            (current) =>
              current.map(
                (semester) =>
                  semester.id ===
                  currentSemester.id
                    ? nextSemester
                    : semester
              )
          );

          setCurrentSemesterId(
            nextSemester.id
          );

          setCurrentSubjectId(
            nextSubjects[0]?.id ??
              ""
          );

          setOnboardingCompleted(
            true
          );

          setOnboardingOpen(
            false
          );

          setViewMode(
            "dashboard"
          );

          return;
        }

        /*
         * First onboarding:
         * create the student's actual initial semester.
         */
        const firstSubject =
          createSubject(
            uniqueNames[0]
          );

        const newSemester: Semester =
          {
            id:
              crypto.randomUUID(),

            name:
              semesterName.trim(),

            subjects: [
              firstSubject,

              ...uniqueNames
                .slice(1)
                .map(
                  createSubject
                ),
            ],
          };

        setSemesters([
          newSemester,
        ]);

        setCurrentSemesterId(
          newSemester.id
        );

        setCurrentSubjectId(
          firstSubject.id
        );

        setOnboardingCompleted(
          true
        );

        setOnboardingOpen(
          false
        );

        setViewMode(
          "dashboard"
        );
      },
      [
        onboardingMode,
        currentSemester,
      ]
    );

  /*
   * =========================================================
   * Authentication actions
   * =========================================================
   */

  const signIn =
    useCallback(
      async (
        email: string,
        password: string
      ) => {
        return await supabase.auth.signInWithPassword(
          {
            email:
              email.trim(),

            password,
          }
        );
      },
      []
    );

  const signUp =
    useCallback(
      async (
        email: string,
        password: string
      ) => {
        return await supabase.auth.signUp(
          {
            email:
              email.trim(),

            password,
          }
        );
      },
      []
    );

  const signOut =
    useCallback(
      async () => {
        const result =
          await supabase.auth.signOut();

        if (result.error) {
          return result;
        }

        /*
         * Shared-device privacy:
         * remove every historical GradeGoal local key.
         */
        clearGradeGoalLocalStorage();

        lastCloudSerializedRef.current =
          null;

        loadedUserRef.current =
          null;

        setCloudReady(
          false
        );

        setSyncStatus(
          "local"
        );

        createFreshState();

        return result;
      },
      [
        createFreshState,
      ]
    );

  return {
    /*
     * State
     */
    semesters,
    currentSemesterId,
    currentSubjectId,

    currentSemester,
    currentSubject,
    subjects,

    onboardingCompleted,
    onboardingOpen,
    onboardingMode,

    viewMode,

    hydrated,
    authReady,

    user,

    cloudReady,
    syncStatus,

    /*
     * Direct navigation
     */
    setViewMode,
    setOnboardingOpen,

    /*
     * Semester
     */
    selectSemester,
    addSemester,

    /*
     * Subject
     */
    selectSubject,
    addSubject,
    updateSubject,
    deleteSubject,

    /*
     * Assessment
     */
    applyAssessmentPreset,
    addAssessment,

    /*
     * Onboarding
     */
    openQuickSetup,
    closeQuickSetup,
    applyOnboarding,

    /*
     * Auth
     */
    signIn,
    signUp,
    signOut,
  };
}