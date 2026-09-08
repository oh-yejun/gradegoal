"use client";

import {
  useState,
} from "react";

import AuthPanel from "../components/gradegoal/AuthPanel";
import Dashboard from "../components/gradegoal/Dashboard";
import Editor from "../components/gradegoal/Editor";
import Onboarding from "../components/gradegoal/Onboarding";

import {
  SubjectPresetSelect,
} from "../components/gradegoal/UI";

import {
  CUSTOM_VALUE,
  SEMESTER_PRESETS,
} from "../lib/gradegoal/constants";

import {
  useGradeGoalStore,
} from "../hooks/useGradeGoalStore";

import type {
  SemesterCreateMode,
} from "../lib/gradegoal/types";

type OnboardingResult = {
  semesterName: string;
  subjectNames: string[];
};

export default function Home() {
  const store =
    useGradeGoalStore();

  const [
    authOpen,
    setAuthOpen,
  ] =
    useState(false);

  const [
    addSubjectOpen,
    setAddSubjectOpen,
  ] =
    useState(false);

  const [
    addSemesterOpen,
    setAddSemesterOpen,
  ] =
    useState(false);

  /*
   * 앱 초기 복원이 끝나기 전에는
   * 빈 화면 대신 간단한 로딩 화면을 보여줍니다.
   */
  if (
    !store.hydrated ||
    !store.authReady
  ) {
    return (
      <LoadingScreen />
    );
  }

  /*
   * 최초 설정 또는 빠른 설정
   */
  if (
    store.onboardingOpen
  ) {
    return (
      <>
        <Onboarding
          mode={
            store.onboardingMode
          }
          initialSemesterName={
            store.currentSemester
              ?.name ??
            "1학년 1학기"
          }
          initialSubjectNames={
            store.onboardingMode ===
            "edit"
              ? store.subjects.map(
                  (subject) =>
                    subject.name
                )
              : []
          }
          onCancel={
            store.onboardingMode ===
            "edit"
              ? store.closeQuickSetup
              : undefined
          }
          onComplete={(
            result
          ) =>
            handleOnboardingComplete(
              result,
              store.onboardingMode,
              store.subjects.map(
                (subject) =>
                  subject.name
              ),
              store.applyOnboarding
            )
          }
        />

        {/*
         * 로그아웃 후에도 온보딩을 다시 끝내지 않고
         * 기존 계정으로 바로 로그인할 수 있게 합니다.
         */}
        {!store.user && (
          <button
            type="button"
            onClick={() =>
              setAuthOpen(
                true
              )
            }
            className="fixed right-4 top-4 z-40 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-600 shadow-lg ring-1 ring-slate-200 transition hover:bg-blue-50"
          >
            기존 계정 로그인
          </button>
        )}

        {authOpen && (
          <AuthPanel
            onClose={() =>
              setAuthOpen(
                false
              )
            }
            onSignIn={async (
              email,
              password
            ) => {
              const result =
                await store.signIn(
                  email,
                  password
                );

              if (
                !result.error
              ) {
                setAuthOpen(
                  false
                );
              }

              return result;
            }}
            onSignUp={
              store.signUp
            }
          />
        )}
      </>
    );
  }

  /*
   * 과목 편집 화면
   */
  if (
    store.viewMode ===
      "editor" &&
    store.currentSubject
  ) {
    return (
      <>
        <Editor
          subject={
            store.currentSubject
          }
          onBack={() =>
            store.setViewMode(
              "dashboard"
            )
          }
          onChangeSubject={
            store.updateSubject
          }
          onDeleteSubject={() =>
            store.deleteSubject(
              store.currentSubject
                ?.id ?? ""
            )
          }
          onApplyPreset={
            store.applyAssessmentPreset
          }
          onAddAssessment={
            store.addAssessment
          }
        />
      </>
    );
  }

  return (
    <>
      <SemesterSwitcher
        semesters={
          store.semesters
        }
        currentSemesterId={
          store.currentSemesterId
        }
        onSelect={
          store.selectSemester
        }
      />

      <Dashboard
        semesterName={
          store.currentSemester
            ?.name ??
          "GradeGoal"
        }
        subjects={
          store.subjects
        }
        syncStatus={
          store.syncStatus
        }
        cloudEnabled={
          Boolean(
            store.user
          )
        }
        userEmail={
          store.user?.email ??
          null
        }
        onOpenSubject={
          store.selectSubject
        }
        onQuickSetup={
          store.openQuickSetup
        }
        onAddSubject={() =>
          setAddSubjectOpen(
            true
          )
        }
        onAddSemester={() =>
          setAddSemesterOpen(
            true
          )
        }
        onSignIn={
          store.user
            ? undefined
            : () =>
                setAuthOpen(
                  true
                )
        }
        onSignOut={
          store.user
            ? () => {
                const confirmed =
                  window.confirm(
                    "로그아웃할까요? 이 브라우저의 GradeGoal 로컬 데이터는 개인정보 보호를 위해 초기화됩니다."
                  );

                if (
                  confirmed
                ) {
                  void store.signOut();
                }
              }
            : undefined
        }
      />

      {authOpen && (
        <AuthPanel
          onClose={() =>
            setAuthOpen(
              false
            )
          }
          onSignIn={async (
            email,
            password
          ) => {
            const result =
              await store.signIn(
                email,
                password
              );

            if (
              !result.error
            ) {
              setAuthOpen(
                false
              );
            }

            return result;
          }}
          onSignUp={
            store.signUp
          }
        />
      )}

      {addSubjectOpen && (
        <AddSubjectDialog
          existingSubjectNames={
            store.subjects.map(
              (subject) =>
                subject.name
            )
          }
          onCancel={() =>
            setAddSubjectOpen(
              false
            )
          }
          onAdd={(name) => {
            store.addSubject(
              name
            );

            setAddSubjectOpen(
              false
            );
          }}
        />
      )}

      {addSemesterOpen && (
        <AddSemesterDialog
          semesters={
            store.semesters
          }
          currentSemesterId={
            store.currentSemesterId
          }
          onCancel={() =>
            setAddSemesterOpen(
              false
            )
          }
          onAdd={(
            name,
            copySourceId
          ) => {
            store.addSemester(
              name,
              copySourceId
            );

            setAddSemesterOpen(
              false
            );
          }}
        />
      )}
    </>
  );
}

/*
 * =========================================================
 * Semester navigation
 * =========================================================
 */

function SemesterSwitcher({
  semesters,
  currentSemesterId,
  onSelect,
}: {
  semesters: Array<{
    id: string;
    name: string;
  }>;

  currentSemesterId: string;

  onSelect: (
    semesterId: string
  ) => void;
}) {
  if (
    semesters.length <=
    1
  ) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {semesters.map(
          (semester) => (
            <button
              key={
                semester.id
              }
              type="button"
              onClick={() =>
                onSelect(
                  semester.id
                )
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                semester.id ===
                currentSemesterId
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {semester.name}
            </button>
          )
        )}
      </div>
    </div>
  );
}

/*
 * =========================================================
 * Add subject
 * =========================================================
 */

function AddSubjectDialog({
  existingSubjectNames,
  onCancel,
  onAdd,
}: {
  existingSubjectNames: string[];

  onCancel: () => void;

  onAdd: (
    name: string
  ) => void;
}) {
  const [
    preset,
    setPreset,
  ] =
    useState("국어");

  const [
    customName,
    setCustomName,
  ] =
    useState("");

  const name =
    preset ===
    CUSTOM_VALUE
      ? customName.trim()
      : preset;

  function submit() {
    if (!name) {
      window.alert(
        "과목명을 입력해주세요."
      );

      return;
    }

    if (
      existingSubjectNames.includes(
        name
      )
    ) {
      window.alert(
        "이미 등록된 과목입니다."
      );

      return;
    }

    onAdd(
      name
    );
  }

  return (
    <DialogShell
      title="과목 추가"
      description="현재 학기에 새로운 과목을 추가합니다."
      onCancel={
        onCancel
      }
    >
      <SubjectPresetSelect
        value={
          preset
        }
        onChange={
          setPreset
        }
      />

      {preset ===
        CUSTOM_VALUE && (
        <input
          autoFocus
          value={
            customName
          }
          onChange={(
            event
          ) =>
            setCustomName(
              event.target.value
            )
          }
          onKeyDown={(
            event
          ) => {
            if (
              event.key ===
              "Enter"
            ) {
              submit();
            }
          }}
          placeholder="과목 이름"
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={
            onCancel
          }
          className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600"
        >
          취소
        </button>

        <button
          type="button"
          onClick={
            submit
          }
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          추가
        </button>
      </div>
    </DialogShell>
  );
}

/*
 * =========================================================
 * Add semester
 * =========================================================
 */

function AddSemesterDialog({
  semesters,
  currentSemesterId,
  onCancel,
  onAdd,
}: {
  semesters: Array<{
    id: string;
    name: string;
  }>;

  currentSemesterId: string;

  onCancel: () => void;

  onAdd: (
    name: string,
    copySourceId?:
      string
  ) => void;
}) {
  const [
    mode,
    setMode,
  ] =
    useState<SemesterCreateMode>(
      "new"
    );

  const [
    semesterPreset,
    setSemesterPreset,
  ] =
    useState<string>(
      SEMESTER_PRESETS[0]
    );

  const [
    customName,
    setCustomName,
  ] =
    useState("");

  const [
    copySourceId,
    setCopySourceId,
  ] =
    useState(
      currentSemesterId
    );

  const semesterName =
    semesterPreset ===
    CUSTOM_VALUE
      ? customName.trim()
      : semesterPreset;

  function submit() {
    if (
      !semesterName
    ) {
      window.alert(
        "학기 이름을 입력해주세요."
      );

      return;
    }

    if (
      semesters.some(
        (semester) =>
          semester.name ===
          semesterName
      )
    ) {
      window.alert(
        "같은 이름의 학기가 이미 있습니다."
      );

      return;
    }

    onAdd(
      semesterName,
      mode === "copy"
        ? copySourceId
        : undefined
    );
  }

  return (
    <DialogShell
      title="학기 추가"
      description="새 학기를 만들거나 기존 학기의 평가 구조를 복사할 수 있습니다."
      onCancel={
        onCancel
      }
    >
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() =>
            setMode(
              "new"
            )
          }
          className={`rounded-lg px-3 py-2.5 text-sm font-bold ${
            mode ===
            "new"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          새로 시작
        </button>

        <button
          type="button"
          onClick={() =>
            setMode(
              "copy"
            )
          }
          className={`rounded-lg px-3 py-2.5 text-sm font-bold ${
            mode ===
            "copy"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          기존 학기 복사
        </button>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-semibold text-slate-600">
          새 학기
        </span>

        <select
          value={
            semesterPreset
          }
          onChange={(
            event
          ) =>
            setSemesterPreset(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

      {semesterPreset ===
        CUSTOM_VALUE && (
        <input
          autoFocus
          value={
            customName
          }
          onChange={(
            event
          ) =>
            setCustomName(
              event.target.value
            )
          }
          placeholder="예: 2027년 1학기"
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      )}

      {mode ===
        "copy" && (
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-slate-600">
            복사할 학기
          </span>

          <select
            value={
              copySourceId
            }
            onChange={(
              event
            ) =>
              setCopySourceId(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  }
                </option>
              )
            )}
          </select>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            과목명, 평가 구조,
            만점, 반영비율과
            목표점수는 복사되며
            실제 받은 점수는
            초기화됩니다.
          </p>
        </label>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={
            onCancel
          }
          className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600"
        >
          취소
        </button>

        <button
          type="button"
          onClick={
            submit
          }
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          학기 추가
        </button>
      </div>
    </DialogShell>
  );
}

/*
 * =========================================================
 * Shared dialog shell
 * =========================================================
 */

function DialogShell({
  title,
  description,
  onCancel,
  children,
}: {
  title: string;

  description: string;

  onCancel: () => void;

  children:
    React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {
                description
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onCancel
            }
            aria-label="창 닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/*
 * =========================================================
 * Onboarding protection
 * =========================================================
 */

function handleOnboardingComplete(
  result: OnboardingResult,
  mode: "first" | "edit",
  existingSubjectNames: string[],
  apply: (
    result: OnboardingResult
  ) => void
) {
  if (
    mode === "edit"
  ) {
    const removedSubjects =
      existingSubjectNames.filter(
        (name) =>
          !result.subjectNames.includes(
            name
          )
      );

    if (
      removedSubjects.length >
      0
    ) {
      const confirmed =
        window.confirm(
          `다음 과목이 빠른 설정에서 제거됩니다:\n\n${removedSubjects.join(
            ", "
          )}\n\n해당 과목에 입력한 데이터도 현재 학기에서 제거됩니다. 계속할까요?`
        );

      if (
        !confirmed
      ) {
        return;
      }
    }
  }

  apply(
    result
  );
}

/*
 * =========================================================
 * Initial loading
 * =========================================================
 */

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-xl font-black text-blue-600">
          GradeGoal
        </p>

        <p className="mt-3 text-sm font-semibold text-slate-500">
          데이터를 불러오는 중...
        </p>
      </div>
    </main>
  );
}