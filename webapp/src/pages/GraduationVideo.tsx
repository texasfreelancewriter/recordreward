import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Music, Download, Loader2, Film, ImageIcon, X, ChevronRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGraduationVideo } from "@/hooks/useGraduationVideo";
import { cn } from "@/lib/utils";

type Phase = "upload" | "processing" | "done";

interface FileInfo {
  name: string;
  type: "image" | "video";
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useCountdown(isProcessing: boolean, totalEstSecs: number) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (isProcessing) {
      startRef.current = Date.now();
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000));
      }, 1000);
      return () => clearInterval(id);
    } else {
      setElapsed(0);
      startRef.current = null;
    }
  }, [isProcessing]);

  const remaining = Math.max(0, totalEstSecs - elapsed);
  return { elapsed, remaining };
}

export default function GraduationVideo() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
  const [pompFile, setPompFile] = useState<File | null>(null);
  const [vibesFile, setVibesFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const pompInputRef = useRef<HTMLInputElement>(null);
  const vibesInputRef = useRef<HTMLInputElement>(null);

  const { createVideo } = useGraduationVideo();

  const photoCount = fileInfos.filter((f) => f.type === "image").length;
  const videoCount = fileInfos.filter((f) => f.type === "video").length;
  const estimatedSecs = Math.max(60, photoCount * 3.5 + videoCount * 15 + 20);

  const { remaining } = useCountdown(phase === "processing", estimatedSecs);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setMediaFiles((prev) => [...prev, ...valid]);
    setFileInfos((prev) => [
      ...prev,
      ...valid.map((f) => ({
        name: f.name,
        type: (f.type.startsWith("video/") ? "video" : "image") as "image" | "video",
        size: f.size,
      })),
    ]);
  }, []);

  const removeAll = () => {
    setMediaFiles([]);
    setFileInfos([]);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleCreate = async () => {
    if (mediaFiles.length === 0) return;
    setPhase("processing");
    setProgress(0);
    setStatus("Starting...");
    setError(null);

    try {
      const url = await createVideo({
        mediaFiles,
        pompFile,
        vibesFile,
        onProgress: setProgress,
        onStatus: setStatus,
      });
      setVideoUrl(url);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("upload");
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "Haylee-Graduation-2026.webm";
    a.click();
  };

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setMediaFiles([]);
    setFileInfos([]);
    setPompFile(null);
    setVibesFile(null);
    setProgress(0);
    setError(null);
    setPhase("upload");
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-[#D4AF37]/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-4 py-1.5 text-[#D4AF37] text-sm mb-5">
            <span>🎓</span>
            <span>Graduation Day • May 16, 2026</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
            Haylee's
            <span className="block text-[#D4AF37]">Graduation Video</span>
          </h1>
          <p className="text-white/50 text-sm mt-3 max-w-sm mx-auto">
            Select your photos &amp; videos from today. Everything stays on your device — nothing is uploaded.
          </p>
        </div>

        {phase === "upload" && (
          <div className="space-y-5">
            {/* Main drop zone */}
            <div
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer",
                isDragging
                  ? "border-[#D4AF37] bg-[#D4AF37]/5"
                  : mediaFiles.length > 0
                  ? "border-[#D4AF37]/40 bg-[#D4AF37]/3"
                  : "border-white/10 hover:border-[#D4AF37]/40 hover:bg-white/2"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => mediaInputRef.current?.click()}
            >
              <input
                ref={mediaInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
              />
              {mediaFiles.length === 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-center gap-3 text-white/20">
                    <ImageIcon className="w-10 h-10" />
                    <Film className="w-10 h-10" />
                  </div>
                  <p className="text-white/60 text-lg font-medium">Tap to select photos &amp; videos</p>
                  <p className="text-white/30 text-sm">Or drag them here from your file manager</p>
                  <p className="text-white/20 text-xs mt-2">JPG, PNG, MP4, MOV, HEIC — select all from today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-6">
                    {photoCount > 0 && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#D4AF37]">{photoCount}</div>
                        <div className="text-xs text-white/50 mt-0.5">photos</div>
                      </div>
                    )}
                    {videoCount > 0 && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#D4AF37]">{videoCount}</div>
                        <div className="text-xs text-white/50 mt-0.5">videos</div>
                      </div>
                    )}
                  </div>
                  <p className="text-white/50 text-sm">
                    Estimated video length: ~{formatTime(estimatedSecs)}
                  </p>
                  <p className="text-[#D4AF37]/70 text-xs">Tap to add more files</p>
                </div>
              )}
            </div>

            {mediaFiles.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeAll(); }}
                className="w-full text-center text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                <X className="w-3 h-3 inline mr-1" />
                Remove all files and start over
              </button>
            )}

            {/* File list preview (last 6) */}
            {fileInfos.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {fileInfos.slice(-8).map((fi, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                    {fi.type === "video" ? (
                      <Film className="w-3 h-3 text-[#D4AF37]/60 flex-shrink-0" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-white/30 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1">{fi.name}</span>
                    <span className="flex-shrink-0 text-white/25">{formatBytes(fi.size)}</span>
                  </div>
                ))}
                {fileInfos.length > 8 && (
                  <p className="text-white/25 text-xs text-center pt-1">
                    +{fileInfos.length - 8} more files
                  </p>
                )}
              </div>
            )}

            {/* Music section */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                <Music className="w-4 h-4 text-[#D4AF37]" />
                <span>Music (optional but highly recommended)</span>
              </div>

              <div className="space-y-3">
                {/* Pomp & Circumstance */}
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    pompFile
                      ? "border-[#D4AF37]/40 bg-[#D4AF37]/5"
                      : "border-white/8 hover:border-white/20"
                  )}
                  onClick={() => pompInputRef.current?.click()}
                >
                  <input
                    ref={pompInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) setPompFile(e.target.files[0]); }}
                  />
                  <Volume2 className="w-4 h-4 text-[#D4AF37]/70 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">Pomp &amp; Circumstance</p>
                    <p className="text-xs text-white/35 truncate">
                      {pompFile ? pompFile.name : "Plays during the ceremony • tap to add MP3"}
                    </p>
                  </div>
                  {pompFile ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPompFile(null); }}
                      className="text-white/30 hover:text-white/60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  )}
                </div>

                {/* Vibes track */}
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    vibesFile
                      ? "border-[#D4AF37]/40 bg-[#D4AF37]/5"
                      : "border-white/8 hover:border-white/20"
                  )}
                  onClick={() => vibesInputRef.current?.click()}
                >
                  <input
                    ref={vibesInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) setVibesFile(e.target.files[0]); }}
                  />
                  <Music className="w-4 h-4 text-[#D4AF37]/70 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">Cool Vibes Track</p>
                    <p className="text-xs text-white/35 truncate">
                      {vibesFile
                        ? vibesFile.name
                        : "Pop / upbeat — something Haylee would love • tap to add MP3"}
                    </p>
                  </div>
                  {vibesFile ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setVibesFile(null); }}
                      className="text-white/30 hover:text-white/60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  )}
                </div>

                <p className="text-white/25 text-xs leading-relaxed px-1">
                  Search "Pomp and Circumstance free mp3" or "graduation song free download" to find music.
                  Any MP3 from your device works — the app handles the mixing.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Create button */}
            <Button
              onClick={handleCreate}
              disabled={mediaFiles.length === 0}
              className="w-full h-14 text-base font-semibold rounded-2xl bg-[#D4AF37] hover:bg-[#b8962e] text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Film className="w-5 h-5 mr-2" />
              Create Haylee's Video
              {mediaFiles.length > 0 && (
                <span className="ml-2 opacity-70 text-sm font-normal">
                  ({mediaFiles.length} files)
                </span>
              )}
            </Button>

            {mediaFiles.length > 0 && (
              <p className="text-center text-white/25 text-xs">
                Processing happens on your device. This will take about {formatTime(estimatedSecs)} — the same length as your video.
                Keep this screen open while it creates.
              </p>
            )}
          </div>
        )}

        {phase === "processing" && (
          <div className="space-y-8 text-center">
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "Georgia, serif" }}>
                Creating the video...
              </h2>
              <p className="text-white/40 text-sm">{status}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-white/50">
                <span>{Math.round(progress)}% complete</span>
                {remaining > 5 && <span>~{formatTime(remaining)} remaining</span>}
              </div>
              <Progress
                value={progress}
                className="h-2 bg-white/10"
              />
              <p className="text-white/25 text-xs">
                Rendering {photoCount} photos + {videoCount} videos with music and chapter titles.
                Keep this tab open.
              </p>
            </div>

            {/* Chapter preview */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 text-left space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Video chapters being built</p>
              {[
                { pct: "0–12%", label: "Opening Title + The Big Day" },
                { pct: "12–45%", label: "She Did It! (stage walk + jumping)" },
                { pct: "45–70%", label: "Surrounded by Love (family)" },
                { pct: "70–88%", label: "A Surprise from Danielle (card opening)" },
                { pct: "88–100%", label: "Congratulations Haylee" },
              ].map((ch) => (
                <div key={ch.pct} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      progress / 100 > parseFloat(ch.pct) / 100
                        ? "bg-[#D4AF37]"
                        : "bg-white/15"
                    )}
                  />
                  <span className="text-white/50 text-xs">{ch.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "done" && videoUrl && (
          <div className="space-y-6 text-center">
            <div>
              <div className="text-5xl mb-4">🎓</div>
              <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "Georgia, serif" }}>
                Haylee's Video is Ready!
              </h2>
              <p className="text-white/50 text-sm">
                {photoCount} photos + {videoCount} videos compiled into one graduation memory.
              </p>
            </div>

            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl aspect-video bg-black"
              />
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleDownload}
                className="w-full h-14 text-base font-semibold rounded-2xl bg-[#D4AF37] hover:bg-[#b8962e] text-black"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Video (WebM)
              </Button>

              <Button
                variant="ghost"
                onClick={reset}
                className="w-full text-white/40 hover:text-white/70"
              >
                Start Over
              </Button>
            </div>

            <p className="text-white/25 text-xs">
              Saved as a .webm file — plays on any modern browser, Android, and Windows.
              For iPhone, open in Chrome or use a free converter app.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
