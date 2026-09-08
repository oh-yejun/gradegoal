"use client";

import {
  FormEvent,
  useState,
} from "react";

import type {
  AuthMode,
} from "../../lib/gradegoal/types";

type AuthResult = {
  error: {
    message: string;
  } | null;
};

type AuthPanelProps = {
  onSignIn: (
    email: string,
    password: string
  ) => Promise<AuthResult>;

  onSignUp: (
    email: string,
    password: string
  ) => Promise<AuthResult>;

  onClose: () => void;
};

export default function AuthPanel({
  onSignIn,
  onSignUp,
  onClose,
}: AuthPanelProps) {
  const [
    mode,
    setMode,
  ] =
    useState<AuthMode>(
      "signin"
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    passwordConfirm,
    setPasswordConfirm,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  function changeMode(
    nextMode: AuthMode
  ) {
    setMode(
      nextMode
    );

    setMessage("");
    setErrorMessage("");
    setPassword("");
    setPasswordConfirm("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim();

    setMessage("");
    setErrorMessage("");

    if (!normalizedEmail) {
      setErrorMessage(
        "이메일을 입력해주세요."
      );

      return;
    }

    if (!password) {
      setErrorMessage(
        "비밀번호를 입력해주세요."
      );

      return;
    }

    if (
      password.length < 6
    ) {
      setErrorMessage(
        "비밀번호는 6자 이상 입력해주세요."
      );

      return;
    }

    if (
      mode === "signup" &&
      password !==
        passwordConfirm
    ) {
      setErrorMessage(
        "비밀번호가 서로 일치하지 않습니다."
      );

      return;
    }

    setSubmitting(
      true
    );

    try {
      if (
        mode === "signin"
      ) {
        const result =
          await onSignIn(
            normalizedEmail,
            password
          );

        if (
          result.error
        ) {
          setErrorMessage(
            translateAuthError(
              result.error.message
            )
          );

          return;
        }

        setMessage(
          "로그인되었습니다."
        );

        return;
      }

      const result =
        await onSignUp(
          normalizedEmail,
          password
        );

      if (
        result.error
      ) {
        setErrorMessage(
          translateAuthError(
            result.error.message
          )
        );

        return;
      }

      setMessage(
        "회원가입 요청이 완료되었습니다. 이메일 인증이 설정된 경우 받은 편지함에서 인증 링크를 확인한 뒤 로그인해주세요."
      );

      setMode(
        "signin"
      );

      setPassword("");
      setPasswordConfirm("");
    } catch (error) {
      console.error(
        "GradeGoal authentication error",
        error
      );

      setErrorMessage(
        "인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-blue-600">
              GradeGoal
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {mode ===
              "signin"
                ? "로그인"
                : "회원가입"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              로그인하면 여러
              기기에서 GradeGoal
              데이터를 사용할 수
              있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="로그인 창 닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() =>
              changeMode(
                "signin"
              )
            }
            className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
              mode ===
              "signin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            로그인
          </button>

          <button
            type="button"
            onClick={() =>
              changeMode(
                "signup"
              )
            }
            className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
              mode ===
              "signup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            회원가입
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-6 space-y-4"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">
              이메일
            </span>

            <input
              type="email"
              autoComplete="email"
              value={
                email
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="example@email.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">
              비밀번호
            </span>

            <input
              type="password"
              autoComplete={
                mode ===
                "signin"
                  ? "current-password"
                  : "new-password"
              }
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="6자 이상"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {mode ===
            "signup" && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">
                비밀번호 확인
              </span>

              <input
                type="password"
                autoComplete="new-password"
                value={
                  passwordConfirm
                }
                onChange={(
                  event
                ) =>
                  setPasswordConfirm(
                    event.target.value
                  )
                }
                placeholder="비밀번호 다시 입력"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold leading-5 text-red-700">
                {
                  errorMessage
                }
              </p>
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold leading-5 text-emerald-700">
                {message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              submitting
            }
            className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "처리 중..."
              : mode ===
                  "signin"
                ? "로그인"
                : "회원가입"}
          </button>
        </form>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-center text-xs leading-5 text-slate-400">
            로그인하지 않아도
            GradeGoal을 사용할 수
            있으며 데이터는 현재
            브라우저에 저장됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function translateAuthError(
  message: string
) {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "invalid login credentials"
    )
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (
    normalized.includes(
      "email not confirmed"
    )
  ) {
    return "이메일 인증이 아직 완료되지 않았습니다. 받은 편지함의 인증 메일을 확인해주세요.";
  }

  if (
    normalized.includes(
      "user already registered"
    )
  ) {
    return "이미 가입된 이메일입니다. 로그인해주세요.";
  }

  if (
    normalized.includes(
      "password should be at least"
    )
  ) {
    return "비밀번호 길이가 너무 짧습니다.";
  }

  if (
    normalized.includes(
      "unable to validate email address"
    )
  ) {
    return "이메일 주소 형식을 확인해주세요.";
  }

  if (
    normalized.includes(
      "rate limit"
    ) ||
    normalized.includes(
      "too many requests"
    )
  ) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }

  return message;
}