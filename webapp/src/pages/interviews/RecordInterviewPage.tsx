import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { uploadVideo } from "@/lib/upload";
import { fetchServerConfig } from "@/lib/template-config";
import { Interview, SaveClipInput } from "@/types/interviews";
import { Button } from "@/components/ui/button";

type RecordingState = "starting" | "recording" | "finishing";

export default function RecordInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const canvasSrcVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("video/webm");

  const [logoUrl, setLogoUrl] = useState<string>("");
  const [recordingState, setRecordingState] = useState<RecordingState>("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { data: interview, isLoading } = useQuery({
    queryKey: ["interview", id],
    queryFn: () => api.get<Interview>(`/api/interviews/${id}`),
    enabled: !!id,
  });

  const saveClipMutation = useMutation({
    mutationFn: (input: SaveClipInput) => api.post(`/api/interviews/${id}/clips`, input),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/api/interviews/${id}`, { status }),
  });

  const questions = interview?.questions ?? [];
  const currentQuestion = questions[0];

  useEffect(() => {
    fetchServerConfig().then((cfg) => {
      if (cfg?.logoImage) setLogoUrl(cfg.logoImage);
    });
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (canvasSrcVideoRef.current) {
      canvasSrcVideoRef.current.srcObject = null;
      canvasSrcVideoRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recordStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : "video/webm";
    mimeTypeRef.current = mimeType;
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setRecordingState("recording");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        let recordStream: MediaStream = stream;
        const currentLogoUrl = logoUrl;

        if (currentLogoUrl) {
          const logoImg = new Image();
          logoImg.src = currentLogoUrl;

          const srcVid = document.createElement("video");
          srcVid.srcObject = stream;
          srcVid.muted = true;
          srcVid.playsInline = true;
          canvasSrcVideoRef.current = srcVid;
          await srcVid.play();

          const w = srcVid.videoWidth || 720;
          const h = srcVid.videoHeight || 1280;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;

          const drawFrame = () => {
            ctx.drawImage(srcVid, 0, 0, w, h);
            if (logoImg.complete && logoImg.naturalWidth > 0) {
              const lh = Math.round(h * 0.1);
              const lw = Math.round(logoImg.naturalWidth * (lh / logoImg.naturalHeight));
              const margin = Math.round(h * 0.025);
              ctx.globalAlpha = 0.9;
              ctx.drawImage(logoImg, w - lw - margin, margin, lw, lh);
              ctx.globalAlpha = 1;
            }
            animFrameRef.current = requestAnimationFrame(drawFrame);
          };
          drawFrame();

          const canvasStream = canvas.captureStream(30);
          stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
          recordStream = canvasStream;
        }
        recordStreamRef.current = recordStream;
        startRecording(recordStream);
      } catch {
        if (!cancelled) setCameraError("Unable to access camera. Please check permissions.");
      }
    };
    if (interview && questions.length > 0) init();
    return () => { cancelled = true; stopCamera(); };
  }, [interview, questions.length, logoUrl, startRecording, stopCamera]);

  const handleDone = async () => {
    if (recordingState !== "recording" || !currentQuestion) return;
    setRecordingState("finishing");

    // Stop recorder and collect blob
    const blob = await new Promise<Blob>((resolve) => {
      if (!mediaRecorderRef.current) { resolve(new Blob()); return; }
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.onstop = () => {
        setTimeout(() => resolve(new Blob(chunksRef.current, { type: mimeTypeRef.current })), 100);
      };
      mediaRecorderRef.current.stop();
    });

    // Stop camera so the light goes off while saving
    stopCamera();

    // Upload, save, then navigate — component must stay mounted until done
    try {
      const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `clip-${currentQuestion.id}.${ext}`, { type: mimeTypeRef.current });
      const uploadResult = await uploadVideo(file);
      await saveClipMutation.mutateAsync({
        questionId: currentQuestion.id,
        videoUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        duration: uploadResult.duration,
      });
      await updateStatusMutation.mutateAsync("recorded");
    } catch {
      // Still go home even if upload fails
    }

    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <div
        className="relative overflow-hidden bg-black"
        style={{ width: "min(100vw, calc(100vh * 9/16))", height: "100vh" }}
      >
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-8 text-center">
            <p className="text-lg font-semibold mb-2">Camera unavailable</p>
            <p className="text-sm text-white/60">{cameraError}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay muted playsInline
            className="absolute inset-0"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
            }}
          />
        )}

        {/* Question overlay */}
        {currentQuestion && recordingState === "recording" && (
          <div
            className="absolute top-0 left-0 right-0 px-5 pt-10 pb-6"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
          >
            <p className="text-white text-xl font-semibold leading-snug text-center drop-shadow">
              {currentQuestion.questionText}
            </p>
          </div>
        )}

        {/* Logo overlay */}
        {logoUrl && recordingState !== "finishing" && (
          <div className="absolute top-3 right-3 z-10" style={{ pointerEvents: "none" }}>
            <img
              src={logoUrl}
              alt="Logo"
              style={{ height: 40, maxWidth: 90, objectFit: "contain", opacity: 0.9 }}
            />
          </div>
        )}

        {/* REC indicator */}
        {recordingState === "recording" && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">REC</span>
          </div>
        )}

        {/* Finishing overlay */}
        {recordingState === "finishing" && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
            <p className="text-white text-lg font-semibold">Saving...</p>
          </div>
        )}

        {/* Done button */}
        {recordingState === "recording" && (
          <div
            className="absolute bottom-0 left-0 right-0 flex justify-center px-6 pb-10 pt-16"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
          >
            <Button
              size="lg"
              onClick={handleDone}
              className="w-full max-w-xs text-lg font-bold py-6 gap-2 text-white"
              style={{ backgroundColor: "#1a4f8a", border: "2px solid rgba(255,255,255,0.4)" }}
            >
              <CheckCircle className="h-5 w-5" />
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
