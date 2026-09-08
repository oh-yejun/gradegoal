import {
  CUSTOM_VALUE,
  SUBJECT_GROUPS,
} from "../../lib/gradegoal/constants";

import type {
  Subject,
  SubjectAnalysis,
  SyncStatus,
} from "../../lib/gradegoal/types";

/*
 * =========================================================
 * 동기화 상태
 * =========================================================
 */

export function SyncLabel({
  status,
}: {
  status: SyncStatus;
}) {
  const labels: Record<
    SyncStatus,
    string
  > = {
    local: "이 기기에 저장",
    syncing: "클라우드 불러오는 중...",
    saving: "클라우드 저장 중...",
    synced: "클라우드 저장 완료",
    error: "동기화 오류",
  };

  return <>{labels[status]}</>;
}

/*
 * =========================================================
 * 과목 선택
 * =========================================================
 */

export function SubjectPresetSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold"
    >
      {SUBJECT_GROUPS.map(
        (group) => (
          <optgroup
            key={group.label}
            label={group.label}
          >
            {group.subjects.map(
              (subject) => (
                <option
                  key={subject}
                  value={subject}
                >
                  {subject}
                </option>
              )
            )}
          </optgroup>
        )
      )}

      <option value={CUSTOM_VALUE}>
        직접 입력
      </option>
    </select>
  );
}

/*
 * =========================================================
 * 빠른 평가 추가 버튼
 * =========================================================
 */

export function QuickAddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
    >
      {label}
    </button>
  );
}

/*
 * =========================================================
 * 과목 카드
 * =========================================================
 */

export function SubjectCard({
  subject,
  analysis,
  onOpen,
}: {
  subject: Subject;
  analysis: SubjectAnalysis;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black">
            {subject.name}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            목표{" "}
            {subject.targetFinalScore}
            점
          </p>
        </div>

        <StatusBadge
          analysis={analysis}
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
                {" "}
                /{" "}
                {analysis.targetMax}
                점
              </span>
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {analysis.targetName} ·
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
              {analysis.targetName}
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
              {analysis.message}
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

/*
 * =========================================================
 * 과목 상태 배지
 * =========================================================
 */

export function StatusBadge({
  analysis,
}: {
  analysis: SubjectAnalysis;
}) {
  const styles: Record<
    SubjectAnalysis["status"],
    string
  > = {
    normal:
      "bg-blue-50 text-blue-700",

    already:
      "bg-emerald-50 text-emerald-700",

    impossible:
      "bg-red-50 text-red-700",

    invalid:
      "bg-amber-50 text-amber-700",
  };

  const labels: Record<
    SubjectAnalysis["status"],
    string
  > = {
    normal: "계산 완료",
    already: "목표 확보",
    impossible: "위험",
    invalid: "설정 필요",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[analysis.status]
      }`}
    >
      {labels[analysis.status]}
    </span>
  );
}

/*
 * =========================================================
 * 대시보드 요약 카드
 * =========================================================
 */

export function SummaryCard({
  label,
  value,
  suffix,
  warning = false,
}: {
  label: string;
  value: string;
  suffix: string;
  warning?: boolean;
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

/*
 * =========================================================
 * 숫자 입력
 * =========================================================
 */

export function NumberInput({
  value,
  onChange,
  suffix,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue =
            event.target.value;

          if (nextValue === "") {
            onChange(0);
            return;
          }

          onChange(
            Number(nextValue)
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

/*
 * =========================================================
 * 빈 값 허용 숫자 입력
 * =========================================================
 */

export function NullableNumberInput({
  value,
  onChange,
  suffix,
  min,
  max,
  step,
}: {
  value: number | null;
  onChange: (
    value: number | null
  ) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder="미입력"
        onChange={(event) => {
          const text =
            event.target.value;

          if (text === "") {
            onChange(null);
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

/*
 * =========================================================
 * 텍스트 입력
 * =========================================================
 */

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-600">
        {label}
      </span>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}