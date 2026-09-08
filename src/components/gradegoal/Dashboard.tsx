"use client";

import {
  useMemo,
} from "react";

import {
  analyzeSubject,
} from "../../lib/gradegoal/calculations";

import type {
  Subject,
  SubjectAnalysis,
  SyncStatus,
} from "../../lib/gradegoal/types";

import {
  SubjectCard,
  SummaryCard,
  SyncLabel,
} from "./UI";

type DashboardProps = {
  semesterName: string;

  subjects: Subject[];

  syncStatus: SyncStatus;

  cloudEnabled: boolean;

  userEmail?: string | null;

  onOpenSubject: (
    subjectId: string
  ) => void;

  onQuickSetup: () => void;

  onAddSubject: () => void;

  onAddSemester: () => void;

  onSignIn?: () => void;

  onSignOut?: () => void;
};

type SubjectWithAnalysis = {
  subject: Subject;
  analysis: SubjectAnalysis;
};

export default function Dashboard({
  semesterName,
  subjects,
  syncStatus,
  cloudEnabled,
  userEmail,
  onOpenSubject,
  onQuickSetup,
  onAddSubject,
  onAddSemester,
  onSignIn,
  onSignOut,
}: DashboardProps) {
  const analyzedSubjects =
    useMemo<
      SubjectWithAnalysis[]
    >(
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

  const summary =
    useMemo(() => {
      let normal = 0;
      let already = 0;
      let impossible = 0;
      let invalid = 0;

      let requiredPercentSum =
        0;

      let requiredPercentCount =
        0;

      for (
        const item of
        analyzedSubjects
      ) {
        switch (
          item.analysis.status
        ) {
          case "normal":
            normal += 1;

            requiredPercentSum +=
              item.analysis
                .requiredPercent;

            requiredPercentCount +=
              1;

            break;

          case "already":
            already += 1;
            break;

          case "impossible":
            impossible += 1;
            break;

          case "invalid":
            invalid += 1;
            break;
        }
      }

      const averageRequiredPercent =
        requiredPercentCount > 0
          ? requiredPercentSum /
            requiredPercentCount
          : null;

      return {
        normal,
        already,
        impossible,
        invalid,

        averageRequiredPercent,
      };
    }, [
      analyzedSubjects,
    ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-blue-600">
                GradeGoal
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {semesterName}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                과목별 목표 성적과
                필요한 점수를 한눈에
                확인하세요.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  onQuickSetup
                }
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
              >
                빠른 설정
              </button>

              <button
                type="button"
                onClick={
                  onAddSubject
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                + 과목 추가
              </button>

              <button
                type="button"
                onClick={
                  onAddSemester
                }
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                + 학기 추가
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  syncStatus ===
                  "error"
                    ? "bg-red-500"
                    : cloudEnabled
                      ? "bg-emerald-500"
                      : "bg-slate-400"
                }`}
              />

              <span className="font-semibold text-slate-600">
                <SyncLabel
                  status={
                    syncStatus
                  }
                />
              </span>
            </div>

            <AccountArea
              cloudEnabled={
                cloudEnabled
              }
              userEmail={
                userEmail
              }
              onSignIn={
                onSignIn
              }
              onSignOut={
                onSignOut
              }
            />
          </div>
        </header>

        <section className="mt-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="전체 과목"
              value={String(
                subjects.length
              )}
              suffix="과목"
            />

            <SummaryCard
              label="목표 확보"
              value={String(
                summary.already
              )}
              suffix="과목"
            />

            <SummaryCard
              label="목표 조정 필요"
              value={String(
                summary.impossible
              )}
              suffix="과목"
              warning={
                summary.impossible >
                0
              }
            />

            <SummaryCard
              label="평균 필요 비율"
              value={
                summary.averageRequiredPercent ===
                null
                  ? "-"
                  : summary.averageRequiredPercent.toFixed(
                      1
                    )
              }
              suffix="%"
            />
          </div>

          {(summary.invalid >
            0 ||
            summary.impossible >
              0) && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-900">
                확인이 필요한
                과목이 있습니다.
              </p>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-amber-800">
                {summary.impossible >
                  0 && (
                  <span>
                    목표 조정 필요{" "}
                    {
                      summary.impossible
                    }
                    과목
                  </span>
                )}

                {summary.invalid >
                  0 && (
                  <span>
                    설정 미완료{" "}
                    {
                      summary.invalid
                    }
                    과목
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                과목별 분석
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                과목을 선택하면
                세부 평가와 목표
                점수를 수정할 수
                있습니다.
              </p>
            </div>

            <p className="text-sm font-bold text-slate-400">
              {
                subjects.length
              }
              개
            </p>
          </div>

          {subjects.length ===
          0 ? (
            <EmptySubjects
              onAddSubject={
                onAddSubject
              }
            />
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {analyzedSubjects.map(
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
                      onOpenSubject(
                        subject.id
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function AccountArea({
  cloudEnabled,
  userEmail,
  onSignIn,
  onSignOut,
}: {
  cloudEnabled: boolean;

  userEmail?: string | null;

  onSignIn?: () => void;

  onSignOut?: () => void;
}) {
  if (
    cloudEnabled &&
    userEmail
  ) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="max-w-56 truncate text-sm font-semibold text-slate-500">
          {userEmail}
        </span>

        {onSignOut && (
          <button
            type="button"
            onClick={
              onSignOut
            }
            className="text-sm font-bold text-slate-600 hover:text-slate-900"
          >
            로그아웃
          </button>
        )}
      </div>
    );
  }

  if (onSignIn) {
    return (
      <button
        type="button"
        onClick={
          onSignIn
        }
        className="text-sm font-bold text-blue-600 hover:text-blue-700"
      >
        로그인하여 클라우드 저장
      </button>
    );
  }

  return (
    <span className="text-sm font-semibold text-slate-400">
      로컬 저장 사용 중
    </span>
  );
}

function EmptySubjects({
  onAddSubject,
}: {
  onAddSubject: () => void;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
      <p className="text-lg font-black text-slate-800">
        등록된 과목이
        없습니다.
      </p>

      <p className="mt-2 text-sm text-slate-500">
        첫 과목을 추가하면
        목표 점수 계산을 시작할
        수 있습니다.
      </p>

      <button
        type="button"
        onClick={
          onAddSubject
        }
        className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
      >
        과목 추가
      </button>
    </div>
  );
}