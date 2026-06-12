import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { uploadVideo } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { getConfig, DEFAULT_CONFIG, TemplateConfig } from "@/lib/template-config";

type PageState = "idle" | "starting" | "previewing" | "recording" | "saving" | "complete" | "not_found";

const COUNTDOWN_SECONDS = 60;

const BLUE = "#1a4f8a";
const BLUE_LIGHT = "#2563b0";

const primaryStyle = {
  background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
  border: "2px solid rgba(255,255,255,0.5)",
  boxShadow: "0 4px 20px rgba(26,79,138,0.6)",
} as const;

type KioskConfig = TemplateConfig & { slug?: string };

const KioskPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<KioskConfig>(getConfig());
  const [configReady, setConfigReady] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) return;
    api.get<KioskConfig>(`/api/public/kiosk/${slug}`)
      .then((c) => {
        if (c) setConfig({
          ...DEFAULT_CONFIG,
          ...c,
          starRatingEnabled: c.starRatingEnabled ?? true,
        });
        setConfigReady(true);
      })
      .catch((err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setPageState("not_found");
        }
        setConfigReady(true);
      });
  }, [slug]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const canvasSourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const mimeTypeRef = useRef<string>("video/webm");

  const [pageState, setPageState] = useState<PageState>("idle");
  const [error, setError] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [interviewId, setInterviewId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [starRating, setStarRating] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [allQuestions, setAllQuestions] = useState<string[]>([]);
  const [allQuestionIds, setAllQuestionIds] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);

  const handleDoneRef = useRef<(() => Promise<void>) | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingUploadsRef = useRef<Promise<void>[]>([]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (canvasSourceVideoRef.current) {
      canvasSourceVideoRef.current.srcObject = null;
      canvasSourceVideoRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recordStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startMediaRecorder = useCallback((recordStream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : "video/webm";
    mimeTypeRef.current = mimeType;
    const mediaRecorder = new MediaRecorder(recordStream, { mimeType });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
  }, []);

  const canStart = guestName.trim().length > 0 && (!(config.emailEnabled ?? true) || guestEmail.trim().length > 0);

  const handleExperience = async (buttonId: "first_time" | "return") => {
    if (pageState !== "idle" || !canStart || !slug) return;
    setError("");
    setPageState("starting");

    const btn = config.buttons.find((b) => b.id === buttonId)!;
    const questions = (btn.questions?.length ?? 0) > 0
      ? btn.questions
      : btn.questionText ? [btn.questionText] : ["Tell us about your visit"];
    const questionText = questions[0];
    setAllQuestions(questions);
    setQuestionIndex(0);

    try {
      const trimmedEmail = guestEmail.trim();
      const result = await api.post<{ interviewId: string; questionId: string }>(
        `/api/public/kiosk/${slug}/quick-start`,
        {
          name: guestName.trim(),
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
          questionText,
          category: "general",
          ...(starRating > 0 ? { starRating } : {}),
        }
      );

      setInterviewId(result.interviewId);
      setQuestionId(result.questionId);
      setCurrentQuestion(questionText);

      // Register remaining questions upfront so handleDone never needs a mid-session API call
      const allQIds = [result.questionId];
      for (let i = 1; i < questions.length; i++) {
        const qResult = await api.post<{ questionId: string }>(
          `/api/public/kiosk/${slug}/interviews/${result.interviewId}/questions`,
          { questionText: questions[i], category: "general" }
        );
        allQIds.push(qResult.questionId);
      }
      setAllQuestionIds(allQIds);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not available. Please open in a browser (not an embedded view) and ensure the page is served over HTTPS.");
      }

      const withTimeout = (p: Promise<MediaStream>, ms: number) =>
        Promise.race([
          p,
          new Promise<never>((_, rej) =>
            setTimeout(
              () => rej(new Error("Camera timed out — please allow camera access when prompted, or open this app in a full browser tab.")),
              ms
            )
          ),
        ]);

      let stream: MediaStream;
      try {
        stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } },
            audio: true,
          }),
          10000
        );
      } catch {
        stream = await withTimeout(navigator.mediaDevices.getUserMedia({ video: true, audio: true }), 10000);
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      let recordStream: MediaStream = stream;
      const logoUrl = config?.logoImage;

      if (logoUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = logoUrl;

        const srcVideo = document.createElement("video");
        srcVideo.srcObject = stream;
        srcVideo.muted = true;
        srcVideo.playsInline = true;
        canvasSourceVideoRef.current = srcVideo;
        await srcVideo.play();

        const w = srcVideo.videoWidth || 720;
        const h = srcVideo.videoHeight || 1280;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;

        const draw = () => {
          ctx.drawImage(srcVideo, 0, 0, canvas.width, canvas.height);
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            const logoH = Math.round(canvas.height * 0.1);
            const logoW = Math.round(logoImg.naturalWidth * (logoH / logoImg.naturalHeight));
            const margin = Math.round(canvas.height * 0.025);
            ctx.globalAlpha = 0.9;
            ctx.drawImage(logoImg, canvas.width - logoW - margin, canvas.height - logoH - margin, logoW, logoH);
            ctx.globalAlpha = 1;
          }
          animFrameRef.current = requestAnimationFrame(draw);
        };
        draw();

        const canvasStream = canvas.captureStream(30);
        stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
        recordStream = canvasStream;
      }

      recordStreamRef.current = recordStream;
      setPageState("previewing");
    } catch (err) {
      stopCamera();
      setPageState("idle");
      const msg =
        err instanceof Error
          ? err.message || (err as DOMException).name || "Camera access was blocked."
          : String(err) || "Camera access was blocked.";
      setError(msg);
      console.error("Camera start failed:", err);
    }
  };

  const handleRetake = () => {
    if (pageState !== "recording") return;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    setPageState("previewing");
  };

  const handleRecord = () => {
    if (pageState !== "previewing" || !recordStreamRef.current) return;
    startMediaRecorder(recordStreamRef.current);
    setPageState("recording");
  };

  const collectBlob = (): Promise<Blob> =>
    new Promise<Blob>((resolve) => {
      if (!mediaRecorderRef.current) { resolve(new Blob()); return; }
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.onstop = () => {
        setTimeout(() => resolve(new Blob(chunksRef.current, { type: mimeTypeRef.current })), 100);
      };
      mediaRecorderRef.current.stop();
    });

  const handleDone = async () => {
    if (pageState !== "recording") return;

    const isLast = (questionIndex + 1) >= allQuestions.length;

    if (!isLast) {
      // Collect blob synchronously, then fire upload in background and advance immediately
      const blob = await collectBlob();
      const capturedQId = questionId;
      const capturedIId = interviewId;
      const capturedMime = mimeTypeRef.current;
      const uploadPromise = (async () => {
        const ext = capturedMime.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `clip-${capturedQId}.${ext}`, { type: capturedMime });
        const uploadResult = await uploadVideo(file);
        await api.post(`/api/public/kiosk/${slug}/interviews/${capturedIId}/clips`, {
          questionId: capturedQId,
          videoUrl: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl ?? undefined,
          duration: uploadResult.duration ?? undefined,
        });
      })().catch((err) => console.error("[bg upload] clip failed:", err));
      pendingUploadsRef.current.push(uploadPromise);

      const nextIndex = questionIndex + 1;
      setQuestionId(allQuestionIds[nextIndex]);
      setCurrentQuestion(allQuestions[nextIndex]);
      setQuestionIndex(nextIndex);
      chunksRef.current = [];
      setPageState("previewing");
      return;
    }

    // Last question: await all background uploads, then save final clip
    setPageState("saving");
    const blob = await collectBlob();

    try {
      if (pendingUploadsRef.current.length > 0) {
        await Promise.all(pendingUploadsRef.current);
        pendingUploadsRef.current = [];
      }
      const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `clip-${questionId}.${ext}`, { type: mimeTypeRef.current });
      const uploadResult = await uploadVideo(file);
      const clipResult = await api.post<{ couponCode?: string | null }>(
        `/api/public/kiosk/${slug}/interviews/${interviewId}/clips`,
        {
          questionId,
          videoUrl: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl ?? undefined,
          duration: uploadResult.duration ?? undefined,
        }
      );
      setCouponCode(clipResult?.couponCode ?? null);
    } catch {
      // Still show complete screen
    }

    stopCamera();
    setPageState("complete");
    setTimeout(() => {
      setPageState("idle");
      setCurrentQuestion("");
      setInterviewId("");
      setQuestionId("");
      setGuestName("");
      setGuestEmail("");
      setStarRating(0);
      setCouponCode(null);
      setAllQuestions([]);
      setAllQuestionIds([]);
      setQuestionIndex(0);
      pendingUploadsRef.current = [];
    }, 15000);
  };

  // Keep ref current so the countdown timer never calls a stale handleDone
  handleDoneRef.current = handleDone;

  // Start/stop countdown timer based on recording state
  useEffect(() => {
    if (pageState === "recording") {
      setCountdown(COUNTDOWN_SECONDS);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            handleDoneRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [pageState]);

  if (pageState === "not_found") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Kiosk not found</h1>
          <p className="text-gray-400">The kiosk URL you visited does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center py-6 px-4"
      style={{ background: "#0a0a0a" }}
    >
      <div
        className="fixed inset-0 z-0"
        style={{ opacity: configReady ? 1 : 0, transition: "opacity 0.4s ease" }}
      >
        <img src={config.backgroundImage} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Single unified card */}
      <div
        className="relative z-10 w-full max-w-[360px] overflow-hidden"
        style={{
          background: "rgba(10, 10, 20, 0.60)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Logo section */}
        {config.logoImage ? (
          <div className="flex items-center justify-center px-6 py-4">
            <img
              src={config.logoImage}
              alt="Logo"
              style={{ maxHeight: "90px", maxWidth: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        ) : null}

        {/* Rate Your Visit row — visible on idle/starting screens only when enabled */}
        {(pageState === "idle" || pageState === "starting") ? (
          <>
            <div className="flex items-center justify-between px-5 py-2.5">
              <span
                className="text-white/60 text-xs font-semibold uppercase tracking-widest"
              >
                Rate Your Visit
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setStarRating(starRating === star ? 0 : star)}
                    disabled={pageState === "starting"}
                    className="transition-all duration-150 active:scale-90 disabled:opacity-40"
                    style={{ background: "none", border: "none", padding: "2px" }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill={star <= starRating ? "#FFD700" : "none"}
                      stroke={star <= starRating ? "#FFD700" : "rgba(255,255,255,0.35)"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }} />
          </>
        ) : null}

        {/* Camera section */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: pageState === "recording" || pageState === "previewing" ? "420px" : "360px",
            transition: "height 0.3s ease",
            display: pageState === "complete" ? "none" : undefined,
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: pageState === "recording" || pageState === "previewing" ? "block" : "none",
              transform: "scaleX(-1)",
            }}
          />

          {pageState === "idle" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg
                className="mb-3 opacity-70"
                style={{ width: 56, height: 56 }}
                fill="none"
                stroke="white"
                strokeWidth={1.4}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
                />
              </svg>
              <p className="text-white text-base font-bold text-center px-6">{config.heroText || "Tell Us About Your Visit"}</p>
              {(config.rewardEnabled ?? true) ? (
                <p className="text-white/50 text-xs text-center mt-1">
                  Receive a <span className="text-white/80 font-medium">{config.rewardText || "reward"}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {pageState === "starting" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
              <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
              <p className="text-white/70 text-sm font-medium">Starting camera...</p>
            </div>
          ) : null}

          {pageState === "previewing" || pageState === "recording" ? (
            <div
              className="absolute top-0 left-0 right-0 px-4 pt-4 pb-10"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)",
              }}
            >
              {allQuestions.length > 1 ? (
                <p
                  className="text-white/60 text-xs font-semibold uppercase tracking-widest text-center mb-1"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,1)" }}
                >
                  Question {questionIndex + 1} of {allQuestions.length}
                </p>
              ) : null}
              <p
                className="text-white text-sm font-semibold leading-snug text-center"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,0.9)" }}
              >
                {currentQuestion}
              </p>
            </div>
          ) : null}

          {(pageState === "previewing" || pageState === "recording") && config.logoImage ? (
            <div className="absolute bottom-2 right-2 z-10" style={{ pointerEvents: "none" }}>
              <img
                src={config.logoImage}
                alt="Logo"
                style={{ height: 36, maxWidth: 80, objectFit: "contain", opacity: 0.9 }}
              />
            </div>
          ) : null}

          {pageState === "recording" ? (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-white">REC</span>
                <span
                  className="text-xs font-mono text-white/70 tabular-nums"
                  style={{ color: countdown <= 10 ? "#f87171" : undefined }}
                >
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
          ) : null}

          {pageState === "saving" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
              <Loader2 className="h-8 w-8 text-white animate-spin mb-3" />
              <p className="text-white text-sm font-semibold">
                {questionIndex < allQuestions.length - 1 ? "Next question coming up..." : "Saving..."}
              </p>
            </div>
          ) : null}
        </div>

        {/* Thank You section */}
        {pageState === "complete" ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-12">
            <div className="mb-5 flex justify-center">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  background: `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})`,
                }}
              >
                <CheckCircle className="h-9 w-9 text-white" />
              </div>
            </div>
            <h2 className="text-white text-xl font-bold mb-3">Thanks for your feedback!</h2>
            {(config.rewardEnabled ?? true) && couponCode ? (
              <div className="w-full">
                <p className="text-white/70 text-sm mb-2">{config.rewardText || "Your reward"}</p>
                <div
                  className="rounded-xl px-4 py-3 mb-2"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  <p className="text-white/60 text-xs mb-1 text-center">Your reward code</p>
                  <p
                    className="text-white text-3xl font-bold tracking-widest text-center"
                    style={{ fontFamily: "monospace" }}
                  >
                    {couponCode}
                  </p>
                </div>
                <p className="text-white/50 text-xs text-center">Also sent to your email · Valid for 30 days</p>
              </div>
            ) : (config.rewardEnabled ?? true) ? (
              <p className="text-white/70 text-sm leading-relaxed">
                Check your email for your reward
                <br />
                <span className="text-white font-semibold">{config.rewardText || "reward"}</span>
              </p>
            ) : (
              <p className="text-white/70 text-sm">Thank you for your feedback!</p>
            )}
          </div>
        ) : null}

        {pageState !== "complete" ? (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }} />
        ) : null}

        {/* Form / Action section */}
        {pageState !== "complete" ? (
          <div className="p-4 flex flex-col gap-3">
            {pageState === "idle" || pageState === "starting" ? (
              <>
                <input
                  type="text"
                  placeholder="Your name"
                  autoComplete="off"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={pageState === "starting"}
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 outline-none disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.93)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#111",
                    WebkitTextFillColor: "#111",
                    WebkitBoxShadow: "0 0 0px 1000px rgba(255,255,255,0.93) inset",
                  }}
                />
                {(config.emailEnabled ?? true) ? (
                  <input
                    type="email"
                    placeholder="Email address"
                    autoComplete="off"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    disabled={pageState === "starting"}
                    className="w-full rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 outline-none disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.93)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "#111",
                      WebkitTextFillColor: "#111",
                      WebkitBoxShadow: "0 0 0px 1000px rgba(255,255,255,0.93) inset",
                    }}
                  />
                ) : null}
                <div className="flex gap-3">
                  {config.buttons.filter((btn) => btn.enabled !== false).map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleExperience(btn.id)}
                      disabled={pageState === "starting" || !canStart}
                      className="flex-1 rounded-xl py-3 px-4 text-sm font-bold tracking-wide transition-all duration-200 text-white disabled:opacity-40"
                      style={primaryStyle}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                {error ? <p className="text-red-400 text-xs text-center">{error}</p> : null}
              </>
            ) : null}

            {pageState === "previewing" ? (
              <Button
                size="lg"
                onClick={handleRecord}
                className="w-full text-sm font-bold py-5 gap-2 text-white active:scale-95 transition-all duration-100"
                style={{
                  background: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)",
                  border: "2px solid rgba(255,255,255,0.4)",
                  boxShadow: "0 4px 20px rgba(185,28,28,0.6)",
                }}
              >
                <span className="h-3 w-3 rounded-full bg-white" />
                Record
              </Button>
            ) : null}

            {pageState === "recording" ? (
              <div className="flex gap-3">
                <Button
                  size="lg"
                  onClick={handleRetake}
                  className="flex-1 text-sm font-bold py-5 gap-2 text-white active:scale-95 active:opacity-60 transition-all duration-100"
                  style={{
                    background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
                    border: "2px solid rgba(255,255,255,0.4)",
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
                <Button
                  size="lg"
                  onClick={handleDone}
                  className="flex-1 text-sm font-bold py-5 gap-2 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
                    border: "2px solid rgba(255,255,255,0.4)",
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  Done
                </Button>
              </div>
            ) : null}

            {pageState === "saving" ? (
              <Button
                size="lg"
                disabled
                className="w-full text-sm font-bold py-5 gap-2 opacity-50 text-white"
                style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)` }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default KioskPage;
