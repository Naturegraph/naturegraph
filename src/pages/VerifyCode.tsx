import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

const CODE_LENGTH = 6;
const TIMER_SECONDS = 120;

export default function VerifyCode() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || "email@example.com";

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = useCallback((seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;

    const next = [...code];
    next[index] = value;
    setCode(next);

    // Auto-focus next input
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (next.every((d) => d !== "")) {
      handleVerify(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;

    const next = [...code];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setCode(next);

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    if (next.every((d) => d !== "")) {
      handleVerify(next.join(""));
    }
  }

  function handleVerify(_code: string) {
    // TODO: Supabase OTP verification
    setTimeout(() => {
      navigate("/onboarding");
    }, 600);
  }

  function handleResend() {
    setCode(Array(CODE_LENGTH).fill(""));
    setTimer(TIMER_SECONDS);
    inputRefs.current[0]?.focus();
    // TODO: Supabase resend OTP
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--color-bg-primary)]">
      {/* Left panel — form */}
      <div className="flex-1 flex flex-col px-6 py-16 lg:px-16 lg:max-w-[512px] xl:max-w-[640px]">
        {/* Back + logo */}
        <div className="flex items-center gap-4 mb-14">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-xl font-bold text-[var(--color-primary)]">
            Naturegraph
          </span>
        </div>

        {/* Content — vertically centered */}
        <div className="flex-1 flex flex-col justify-center max-w-sm">
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-4">
            {t("auth.verifyTitle")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-10">
            {t("auth.verifySubtitle", { email })}
          </p>

          {/* Code label */}
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
            {t("auth.verifyCodeLabel")}
          </p>

          {/* Code inputs */}
          <div className="flex gap-2 mb-3" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-full aspect-square max-w-[56px] text-center text-xl font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors"
                aria-label={`Chiffre ${i + 1}`}
              />
            ))}
          </div>

          {/* Timer */}
          <p className="text-sm text-[var(--color-text-tertiary)] mb-12">
            {t("auth.verifyTimer", { time: formatTime(timer) })}
          </p>

          {/* Resend */}
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("auth.verifyNoCode")}
            </p>
            <button
              onClick={handleResend}
              disabled={timer > 0}
              className="text-sm font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("auth.verifyResend")}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — image (desktop only) */}
      <div className="hidden lg:block flex-1 relative bg-[var(--color-neutral-800)] rounded-l-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary-dark)]/40" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-white/70">Credit photo</span>
            <span className="text-sm text-white">@emie_photographie_nature</span>
          </div>
        </div>
      </div>
    </div>
  );
}
