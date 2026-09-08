"use client";

import {
  useMemo,
} from "react";

import {
  ASSESSMENT_PRESETS,
} from "../../lib/gradegoal/constants";

import {
  analyzeSubject,
  getTotalWeight,
} from "../../lib/gradegoal/calculations";

import type {
  Assessment,
  AssessmentPresetId,
  AssessmentType,
  Subject,
} from "../../lib/gradegoal/types";

import {
  NullableNumberInput,
  NumberInput,
  QuickAddButton,
  StatusBadge,
  TextInput,
} from "./UI";

type EditorProps = {
  subject: Subject;

  onBack: () => void;

  onChangeSubject: (
    subject: Subject
  ) => void;

  onDeleteSubject: () => void;

  onApplyPreset: (
    presetId: AssessmentPresetId
  ) => void;

  onAddAssessment: (
    type: AssessmentType,
    name: string
  ) => void;
};

export default function Editor({
  subject,
  onBack,
  onChangeSubject,
  onDeleteSubject,
  onApplyPreset,
  onAddAssessment,
}: EditorProps) {
  const analysis =
    useMemo(
      () =>
        analyzeSubject(
          subject
        ),
      [subject]
    );

  const totalWeight =
    useMemo(
      () =>
        getTotalWeight(
          subject
        ),
      [subject]
    );

  function updateSubject(
    patch: Partial<Subject>
  ) {
    onChangeSubject({
      ...subject,
      ...patch,
    });
  }

  function updateAssessment(
    assessmentId: number,
    patch: Partial<Assessment>
  ) {
    updateSubject({
      assessments:
        subject.assessments.map(
          (assessment) =>
            assessment.id ===
            assessmentId
              ? {
                  ...assessment,
                  ...patch,
                }
              : assessment
        ),
    });
  }

  function deleteAssessment(
    assessmentId: number
  ) {
    if (
      subject.assessments.length <=
      1
    ) {
      window.alert(
        "평가는 최소 1개 이상 있어야 합니다."
      );

      return;
    }

    const nextAssessments =
      subject.assessments.filter(
        (assessment) =>
          assessment.id !==
          assessmentId
      );

    let nextTargetId =
      subject.targetAssessmentId;

    if (
      assessmentId ===
      subject.targetAssessmentId
    ) {
      nextTargetId =
        nextAssessments[
          nextAssessments.length -
            1
        ].id;
    }

    updateSubject({
      assessments:
        nextAssessments,

      targetAssessmentId:
        nextTargetId,
    });
  }

  function confirmDeleteSubject() {
    const ok =
      window.confirm(
        `"${subject.name}" 과목을 삭제할까요?`
      );

    if (!ok) {
      return;
    }

    onDeleteSubject();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={
                  onBack
                }
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                ← 대시보드
              </button>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {subject.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                평가 점수와
                반영비율을 입력하면
                목표 달성에 필요한
                점수를 계산합니다.
              </p>
            </div>

            <StatusBadge
              analysis={
                analysis
              }
            />
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <BasicSettings
              subject={
                subject
              }
              totalWeight={
                totalWeight
              }
              onChangeSubject={
                updateSubject
              }
            />

            <PresetArea
              onApplyPreset={
                onApplyPreset
              }
            />

            <AssessmentArea
              subject={
                subject
              }
              onUpdateAssessment={
                updateAssessment
              }
              onDeleteAssessment={
                deleteAssessment
              }
              onTargetChange={(
                assessmentId
              ) =>
                updateSubject({
                  targetAssessmentId:
                    assessmentId,
                })
              }
              onAddAssessment={
                onAddAssessment
              }
            />
          </div>

          <aside className="space-y-6">
            <ResultCard
              subject={
                subject
              }
              totalWeight={
                totalWeight
              }
            />

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-black text-slate-900">
                과목 관리
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                과목 삭제 시 현재
                입력된 평가 정보도
                함께 삭제됩니다.
              </p>

              <button
                type="button"
                onClick={
                  confirmDeleteSubject
                }
                className="mt-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700 transition hover:bg-red-100"
              >
                과목 삭제
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function BasicSettings({
  subject,
  totalWeight,
  onChangeSubject,
}: {
  subject: Subject;

  totalWeight: number;

  onChangeSubject: (
    patch: Partial<Subject>
  ) => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <h2 className="text-lg font-black text-slate-900">
        기본 설정
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextInput
          label="과목명"
          value={
            subject.name
          }
          onChange={(
            name
          ) =>
            onChangeSubject({
              name,
            })
          }
        />

        <div>
          <label className="mb-2 block text-sm text-slate-600">
            목표 최종점수
          </label>

          <NumberInput
            value={
              subject.targetFinalScore
            }
            min={0}
            max={100}
            step={0.1}
            suffix="점"
            onChange={(
              targetFinalScore
            ) =>
              onChangeSubject({
                targetFinalScore,
              })
            }
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-600">
            전체 반영비율
          </span>

          <span
            className={`text-lg font-black ${
              Math.abs(
                totalWeight -
                  100
              ) < 0.01
                ? "text-emerald-600"
                : "text-red-600"
            }`}
          >
            {totalWeight}%
          </span>
        </div>

        {Math.abs(
          totalWeight - 100
        ) >= 0.01 && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            전체 반영비율의
            합은 100%가 되어야
            합니다.
          </p>
        )}
      </div>
    </section>
  );
}

function PresetArea({
  onApplyPreset,
}: {
  onApplyPreset: (
    presetId: AssessmentPresetId
  ) => void;
}) {
  function handleApply(
    presetId: AssessmentPresetId
  ) {
    const ok =
      window.confirm(
        "프리셋을 적용하면 현재 평가 구성과 입력 점수가 변경됩니다. 계속할까요?"
      );

    if (!ok) {
      return;
    }

    onApplyPreset(
      presetId
    );
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <h2 className="text-lg font-black text-slate-900">
        평가 빠른 설정
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        학교의 평가 구성이
        비슷하다면 프리셋을
        적용한 뒤 세부 값을
        수정하세요.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {ASSESSMENT_PRESETS.map(
          (preset) => (
            <button
              key={
                preset.id
              }
              type="button"
              onClick={() =>
                handleApply(
                  preset.id
                )
              }
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="font-black text-slate-900">
                {preset.name}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {
                  preset.description
                }
              </p>
            </button>
          )
        )}
      </div>
    </section>
  );
}

function AssessmentArea({
  subject,
  onUpdateAssessment,
  onDeleteAssessment,
  onTargetChange,
  onAddAssessment,
}: {
  subject: Subject;

  onUpdateAssessment: (
    assessmentId: number,
    patch: Partial<Assessment>
  ) => void;

  onDeleteAssessment: (
    assessmentId: number
  ) => void;

  onTargetChange: (
    assessmentId: number
  ) => void;

  onAddAssessment: (
    type: AssessmentType,
    name: string
  ) => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div>
        <h2 className="text-lg font-black text-slate-900">
          평가 항목
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          계산하려는 미래
          평가를 왼쪽 원형
          버튼으로 선택하세요.
          선택한 평가의 받은
          점수는 입력하지
          않습니다.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {subject.assessments.map(
          (
            assessment,
            index
          ) => (
            <AssessmentRow
              key={
                assessment.id
              }
              assessment={
                assessment
              }
              index={
                index
              }
              isTarget={
                assessment.id ===
                subject.targetAssessmentId
              }
              onTarget={() =>
                onTargetChange(
                  assessment.id
                )
              }
              onChange={(
                patch
              ) =>
                onUpdateAssessment(
                  assessment.id,
                  patch
                )
              }
              onDelete={() =>
                onDeleteAssessment(
                  assessment.id
                )
              }
            />
          )
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-black text-slate-700">
          평가 추가
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickAddButton
            label="+ 중간고사"
            onClick={() =>
              onAddAssessment(
                "written",
                "중간고사"
              )
            }
          />

          <QuickAddButton
            label="+ 기말고사"
            onClick={() =>
              onAddAssessment(
                "written",
                "기말고사"
              )
            }
          />

          <QuickAddButton
            label="+ 수행평가"
            onClick={() =>
              onAddAssessment(
                "performance",
                "수행평가"
              )
            }
          />

          <QuickAddButton
            label="+ 기타 평가"
            onClick={() =>
              onAddAssessment(
                "performance",
                "기타 평가"
              )
            }
          />
        </div>
      </div>
    </section>
  );
}

function AssessmentRow({
  assessment,
  index,
  isTarget,
  onTarget,
  onChange,
  onDelete,
}: {
  assessment: Assessment;

  index: number;

  isTarget: boolean;

  onTarget: () => void;

  onChange: (
    patch: Partial<Assessment>
  ) => void;

  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isTarget
          ? "border-blue-300 bg-blue-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-3">
          <input
            type="radio"
            checked={
              isTarget
            }
            onChange={
              onTarget
            }
            aria-label={`${assessment.name}을 계산 대상으로 선택`}
            className="h-4 w-4 accent-blue-600"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-400">
              평가{" "}
              {index + 1}
            </p>

            {isTarget && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                계산 대상
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                평가명
              </span>

              <input
                value={
                  assessment.name
                }
                onChange={(
                  event
                ) =>
                  onChange({
                    name:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                평가 유형
              </span>

              <select
                value={
                  assessment.type
                }
                onChange={(
                  event
                ) =>
                  onChange({
                    type:
                      event
                        .target
                        .value as AssessmentType,
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="written">
                  지필평가
                </option>

                <option value="performance">
                  수행평가
                </option>
              </select>
            </label>

            <div>
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                받은 점수
              </span>

              {isTarget ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700">
                  자동 계산
                </div>
              ) : (
                <NullableNumberInput
                  value={
                    assessment.score
                  }
                  min={0}
                  max={
                    assessment.maxScore
                  }
                  step={0.1}
                  suffix="점"
                  onChange={(
                    score
                  ) =>
                    onChange({
                      score,
                    })
                  }
                />
              )}
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                만점
              </span>

              <NumberInput
                value={
                  assessment.maxScore
                }
                min={1}
                step={0.1}
                suffix="점"
                onChange={(
                  maxScore
                ) =>
                  onChange({
                    maxScore,
                  })
                }
              />
            </div>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                반영비율
              </span>

              <NumberInput
                value={
                  assessment.weight
                }
                min={0}
                max={100}
                step={0.1}
                suffix="%"
                onChange={(
                  weight
                ) =>
                  onChange({
                    weight,
                  })
                }
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={
                onDelete
              }
              className="text-sm font-bold text-red-600 hover:text-red-700"
            >
              평가 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  subject,
  totalWeight,
}: {
  subject: Subject;

  totalWeight: number;
}) {
  const analysis =
    useMemo(
      () =>
        analyzeSubject(
          subject
        ),
      [subject]
    );

  return (
    <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
      <p className="text-sm font-bold text-slate-300">
        목표 계산
      </p>

      <p className="mt-1 text-sm text-slate-400">
        최종{" "}
        {subject.targetFinalScore}
        점 목표
      </p>

      <div className="mt-6">
        {analysis.status ===
          "normal" && (
          <>
            <p className="text-sm text-slate-300">
              {
                analysis.targetName
              }
              에서 필요한 점수
            </p>

            <p className="mt-2 text-4xl font-black">
              {analysis.requiredScore.toFixed(
                1
              )}

              <span className="ml-2 text-base font-semibold text-slate-400">
                /{" "}
                {
                  analysis.targetMax
                }
                점
              </span>
            </p>

            <p className="mt-3 text-sm text-slate-300">
              만점 대비{" "}
              {analysis.requiredPercent.toFixed(
                1
              )}
              %
            </p>
          </>
        )}

        {analysis.status ===
          "already" && (
          <>
            <p className="text-2xl font-black text-emerald-400">
              목표 확보
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              현재 입력된
              평가만으로 목표
              점수를 이미
              확보했습니다.
            </p>
          </>
        )}

        {analysis.status ===
          "impossible" && (
          <>
            <p className="text-2xl font-black text-red-400">
              현재 목표 달성 불가
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {
                analysis.targetName
              }
              에서{" "}
              {analysis.requiredScore.toFixed(
                1
              )}
              점이 필요하지만
              만점은{" "}
              {
                analysis.targetMax
              }
              점입니다.
            </p>
          </>
        )}

        {analysis.status ===
          "invalid" && (
          <>
            <p className="text-2xl font-black text-amber-300">
              설정 확인 필요
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {
                analysis.message
              }
            </p>
          </>
        )}
      </div>

      <div className="mt-6 border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            총 반영비율
          </span>

          <span
            className={`font-black ${
              Math.abs(
                totalWeight -
                  100
              ) < 0.01
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {totalWeight}%
          </span>
        </div>
      </div>
    </div>
  );
}