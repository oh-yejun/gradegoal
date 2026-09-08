"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  CUSTOM_VALUE,
  SEMESTER_PRESETS,
  SUBJECT_GROUPS,
} from "../../lib/gradegoal/constants";

import type {
  OnboardingMode,
} from "../../lib/gradegoal/types";

type OnboardingResult = {
  semesterName: string;
  subjectNames: string[];
};

type OnboardingProps = {
  mode: OnboardingMode;

  initialSemesterName?: string;

  initialSubjectNames?: string[];

  onCancel?: () => void;

  onComplete: (
    result: OnboardingResult
  ) => void;
};

export default function Onboarding({
  mode,
  initialSemesterName =
    "1학년 1학기",
  initialSubjectNames = [],
  onCancel,
  onComplete,
}: OnboardingProps) {
  const allSubjects =
    useMemo(
      () =>
        SUBJECT_GROUPS.flatMap(
          (group) =>
            group.subjects
        ),
      []
    );

  const initialSemesterPreset =
    SEMESTER_PRESETS.includes(
      initialSemesterName as
        (typeof SEMESTER_PRESETS)[number]
    )
      ? initialSemesterName
      : CUSTOM_VALUE;

  const [
    step,
    setStep,
  ] =
    useState<1 | 2 | 3>(
      1
    );

  const [
    semesterPreset,
    setSemesterPreset,
  ] =
    useState(
      initialSemesterPreset
    );

  const [
    customSemesterName,
    setCustomSemesterName,
  ] =
    useState(
      initialSemesterPreset ===
        CUSTOM_VALUE
        ? initialSemesterName
        : ""
    );

  const [
    selectedSubjects,
    setSelectedSubjects,
  ] =
    useState<string[]>(
      initialSubjectNames
    );

  const [
    customSubjectName,
    setCustomSubjectName,
  ] =
    useState("");

  const semesterName =
    semesterPreset ===
    CUSTOM_VALUE
      ? customSemesterName.trim()
      : semesterPreset;

  function toggleSubject(
    name: string
  ) {
    setSelectedSubjects(
      (current) => {
        if (
          current.includes(name)
        ) {
          return current.filter(
            (item) =>
              item !== name
          );
        }

        return [
          ...current,
          name,
        ];
      }
    );
  }

  function addCustomSubject() {
    const name =
      customSubjectName.trim();

    if (!name) {
      return;
    }

    setSelectedSubjects(
      (current) => {
        if (
          current.includes(name)
        ) {
          return current;
        }

        return [
          ...current,
          name,
        ];
      }
    );

    setCustomSubjectName("");
  }

  function goToStep2() {
    if (!semesterName) {
      return;
    }

    setStep(2);
  }

  function goToStep3() {
    if (
      selectedSubjects.length ===
      0
    ) {
      return;
    }

    setStep(3);
  }

  function complete() {
    if (
      !semesterName ||
      selectedSubjects.length ===
        0
    ) {
      return;
    }

    onComplete({
      semesterName,

      subjectNames:
        selectedSubjects,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-bold text-blue-600">
            GradeGoal
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {mode === "first"
              ? "처음 설정하기"
              : "빠른 설정"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            학기와 과목을
            선택하면 GradeGoal을
            바로 사용할 수
            있습니다.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2">
          <StepIndicator
            number={1}
            label="학기"
            active={step === 1}
            completed={step > 1}
          />

          <StepIndicator
            number={2}
            label="과목"
            active={step === 2}
            completed={step > 2}
          />

          <StepIndicator
            number={3}
            label="확인"
            active={step === 3}
            completed={false}
          />
        </div>

        {step === 1 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black text-slate-900">
              현재 학기를
              선택하세요
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {SEMESTER_PRESETS.map(
                (semester) => (
                  <button
                    key={semester}
                    type="button"
                    onClick={() =>
                      setSemesterPreset(
                        semester
                      )
                    }
                    className={`rounded-2xl border px-4 py-4 text-left font-bold transition ${
                      semesterPreset ===
                      semester
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                    }`}
                  >
                    {semester}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setSemesterPreset(
                    CUSTOM_VALUE
                  )
                }
                className={`rounded-2xl border px-4 py-4 text-left font-bold transition ${
                  semesterPreset ===
                  CUSTOM_VALUE
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                }`}
              >
                직접 입력
              </button>
            </div>

            {semesterPreset ===
              CUSTOM_VALUE && (
              <div className="mt-4">
                <label className="text-sm font-semibold text-slate-600">
                  학기 이름
                </label>

                <input
                  value={
                    customSemesterName
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomSemesterName(
                      event.target
                        .value
                    )
                  }
                  placeholder="예: 2026년 2학기"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={
                  !semesterName
                }
                onClick={
                  goToStep2
                }
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                다음
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black text-slate-900">
              수강 과목을
              선택하세요
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              여러 과목을 동시에
              선택할 수 있습니다.
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
                      {group.label}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {group.subjects.map(
                        (
                          subject
                        ) => {
                          const selected =
                            selectedSubjects.includes(
                              subject
                            );

                          return (
                            <button
                              key={
                                subject
                              }
                              type="button"
                              onClick={() =>
                                toggleSubject(
                                  subject
                                )
                              }
                              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                                selected
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                              }`}
                            >
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
              <p className="text-sm font-black text-slate-700">
                직접 과목 추가
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  value={
                    customSubjectName
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomSubjectName(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();
                      addCustomSubject();
                    }
                  }}
                  placeholder="과목 이름"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={
                    addCustomSubject
                  }
                  className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
                >
                  추가
                </button>
              </div>
            </div>

            {selectedSubjects.some(
              (subject) =>
                !allSubjects.includes(
                  subject as
                    (typeof allSubjects)[number]
                )
            ) && (
              <div className="mt-4">
                <p className="text-sm font-black text-slate-700">
                  직접 추가한 과목
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSubjects
                    .filter(
                      (subject) =>
                        !allSubjects.includes(
                          subject as
                            (typeof allSubjects)[number]
                        )
                    )
                    .map(
                      (subject) => (
                        <button
                          key={
                            subject
                          }
                          type="button"
                          onClick={() =>
                            toggleSubject(
                              subject
                            )
                          }
                          className="rounded-full border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          {subject} ×
                        </button>
                      )
                    )}
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setStep(1)
                }
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600"
              >
                이전
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-500">
                  {
                    selectedSubjects.length
                  }
                  개 선택
                </span>

                <button
                  type="button"
                  disabled={
                    selectedSubjects.length ===
                    0
                  }
                  onClick={
                    goToStep3
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  다음
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black text-slate-900">
              설정을
              확인하세요
            </h2>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                학기
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                {semesterName}
              </p>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  과목
                </p>

                <p className="text-xs font-bold text-blue-600">
                  {
                    selectedSubjects.length
                  }
                  개
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedSubjects.map(
                  (subject) => (
                    <span
                      key={
                        subject
                      }
                      className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200"
                    >
                      {subject}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="mt-7 flex justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setStep(2)
                }
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600"
              >
                이전
              </button>

              <div className="flex gap-2">
                {mode ===
                  "edit" &&
                  onCancel && (
                    <button
                      type="button"
                      onClick={
                        onCancel
                      }
                      className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600"
                    >
                      취소
                    </button>
                  )}

                <button
                  type="button"
                  onClick={
                    complete
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
                >
                  {mode ===
                  "first"
                    ? "GradeGoal 시작"
                    : "설정 적용"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 text-center ${
        active
          ? "border-blue-500 bg-blue-50"
          : completed
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
          active
            ? "bg-blue-600 text-white"
            : completed
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-500"
        }`}
      >
        {completed
          ? "✓"
          : number}
      </div>

      <p className="mt-1 text-xs font-bold text-slate-600">
        {label}
      </p>
    </div>
  );
}