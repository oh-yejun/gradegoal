import {
  ASSESSMENT_PRESETS,
  DEFAULT_TARGET_SCORE,
} from "./constants";

import type {
  Assessment,
  AssessmentPresetId,
  CloudPayload,
  Semester,
  Subject,
  SubjectAnalysis,
} from "./types";

export function createId() {
  return crypto.randomUUID();
}

export function createAssessmentsFromPreset(
  presetId: AssessmentPresetId
) {
  const preset =
    ASSESSMENT_PRESETS.find(
      (item) => item.id === presetId
    ) ?? ASSESSMENT_PRESETS[0];

  const assessments: Assessment[] =
    preset.items.map(
      (item, index) => ({
        id: index + 1,
        name: item.name,
        type: item.type,
        score: null,
        maxScore: item.maxScore,
        weight: item.weight,
      })
    );

  return {
    assessments,
    targetAssessmentId:
      assessments[
        preset.targetIndex
      ].id,
  };
}

export function createSubject(
  name: string
): Subject {
  const preset =
    createAssessmentsFromPreset(
      "standard"
    );

  return {
    id: createId(),
    name,
    targetFinalScore:
      DEFAULT_TARGET_SCORE,
    targetAssessmentId:
      preset.targetAssessmentId,
    assessments:
      preset.assessments,
  };
}

export function createSemester(
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

export function cloneSubjectTemplate(
  subject: Subject
): Subject {
  return {
    id: createId(),

    name:
      subject.name,

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

export function normalizeAssessment(
  assessment: Assessment
): Assessment {
  return {
    ...assessment,

    score:
      typeof assessment.score ===
      "number"
        ? assessment.score
        : null,
  };
}

export function normalizeSubject(
  subject: Subject
): Subject {
  return {
    ...subject,

    assessments:
      Array.isArray(
        subject.assessments
      )
        ? subject.assessments.map(
            normalizeAssessment
          )
        : [],
  };
}

export function normalizeSemester(
  semester: Semester
): Semester {
  return {
    ...semester,

    subjects:
      Array.isArray(
        semester.subjects
      )
        ? semester.subjects.map(
            normalizeSubject
          )
        : [],
  };
}

export function normalizePayload(
  payload: CloudPayload
) {
  if (
    !payload ||
    !Array.isArray(
      payload.semesters
    ) ||
    payload.semesters.length === 0
  ) {
    return null;
  }

  const semesters =
    payload.semesters
      .map(normalizeSemester)
      .filter(
        (semester) =>
          semester.subjects.length >
          0
      );

  if (
    semesters.length === 0
  ) {
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
      payload.onboardingCompleted ??
      true,
  };
}

export function analyzeSubject(
  subject: Subject
): SubjectAnalysis {
  const totalWeight =
    subject.assessments.reduce(
      (sum, item) =>
        sum + item.weight,
      0
    );

  if (
    Math.abs(
      totalWeight - 100
    ) > 0.01
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
      message:
        "목표점수 오류",
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
      message:
        "계산 대상 없음",
    };
  }

  if (
    target.maxScore <= 0 ||
    target.weight <= 0
  ) {
    return {
      status: "invalid",
      message:
        "평가 설정 오류",
    };
  }

  for (
    const item of
    subject.assessments
  ) {
    if (
      item.maxScore <= 0
    ) {
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
      if (
        item.score === null
      ) {
        return {
          status: "invalid",
          message:
            `${item.name} 점수 미입력`,
        };
      }

      if (
        item.score < 0 ||
        item.score >
          item.maxScore
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
    getCompletedContribution(
      subject
    );

  const requiredScore =
    ((subject.targetFinalScore -
      completed) /
      target.weight) *
    target.maxScore;

  if (
    requiredScore <= 0
  ) {
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

export function getCompletedContribution(
  subject: Subject
) {
  return subject.assessments
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
}

export function calculateFinalScore(
  subject: Subject,
  rawScore: number
) {
  const target =
    subject.assessments.find(
      (item) =>
        item.id ===
        subject.targetAssessmentId
    );

  if (!target) {
    return 0;
  }

  return (
    getCompletedContribution(
      subject
    ) +
    (rawScore /
      target.maxScore) *
      target.weight
  );
}

export function getTotalWeight(
  subject: Subject
) {
  return subject.assessments.reduce(
    (sum, item) =>
      sum + item.weight,
    0
  );
}

export function validateSubject(
  subject: Subject
) {
  const totalWeight =
    getTotalWeight(subject);

  if (
    Math.abs(
      totalWeight - 100
    ) > 0.01
  ) {
    return `평가 비중의 합이 100%가 되어야 합니다. 현재 ${totalWeight}%입니다.`;
  }

  const target =
    subject.assessments.find(
      (item) =>
        item.id ===
        subject.targetAssessmentId
    );

  if (!target) {
    return "목표 계산 평가를 선택해주세요.";
  }

  if (
    subject.targetFinalScore < 0 ||
    subject.targetFinalScore > 100
  ) {
    return "목표점수는 0~100 사이여야 합니다.";
  }

  for (
    const item of
    subject.assessments
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
      subject.targetAssessmentId
    ) {
      if (
        item.score === null
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