import { useCallback } from "react";

export interface MediaFileItem {
  file: File;
  type: "image" | "video";
  timestamp: number;
  kenBurnsDir: "right" | "left" | "up" | "down";
}

export interface CreateVideoOptions {
  mediaFiles: File[];
  pompFile: File | null;
  vibesFile: File | null;
  onProgress: (pct: number) => void;
  onStatus: (msg: string) => void;
}

interface TimelineItem {
  fileItem: MediaFileItem;
  startTime: number;
  duration: number;
}

interface Timeline {
  items: TimelineItem[];
  totalDuration: number;
}

const DIRS = ["right", "left", "up", "down"] as const;
const FPS = 30;
const FRAME_MS = 1000 / FPS;

function sortAndTagFiles(files: File[]): MediaFileItem[] {
  const dirs = [...DIRS, ...DIRS, ...DIRS, ...DIRS];
  return files
    .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
    .sort((a, b) => a.lastModified - b.lastModified)
    .map((file, i) => ({
      file,
      type: file.type.startsWith("video/") ? "video" : "image",
      timestamp: file.lastModified,
      kenBurnsDir: dirs[i % dirs.length],
    }));
}

function buildTimeline(items: MediaFileItem[], targetSecs: number): Timeline {
  const VIDEO_MAX = 30;
  const PHOTO_MIN = 2;
  const PHOTO_DEFAULT = 3.5;

  const videoItems = items.filter((i) => i.type === "video");
  const photoItems = items.filter((i) => i.type === "image");

  const videoDurationEstimate = Math.min(videoItems.length * 15, videoItems.length * VIDEO_MAX);
  const remainingForPhotos = Math.max(targetSecs - videoDurationEstimate, photoItems.length * PHOTO_MIN);
  const photoDuration = Math.max(PHOTO_MIN, Math.min(PHOTO_DEFAULT, remainingForPhotos / Math.max(1, photoItems.length)));

  const timelineItems: TimelineItem[] = [];
  let cursor = 10; // opening title card

  for (const item of items) {
    const dur = item.type === "video" ? VIDEO_MAX : photoDuration;
    timelineItems.push({ fileItem: item, startTime: cursor, duration: dur });
    cursor += dur;
  }

  const closingStart = cursor;
  const totalDuration = closingStart + 10;

  return { items: timelineItems, totalDuration };
}

async function loadAudioBuffer(ctx: AudioContext, file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  source: HTMLImageElement | HTMLVideoElement,
  naturalW: number,
  naturalH: number,
  t: number,
  dir: MediaFileItem["kenBurnsDir"]
) {
  const imgAspect = naturalW / naturalH;
  const canvasAspect = cw / ch;

  let baseW: number, baseH: number;
  if (imgAspect > canvasAspect) {
    baseH = ch;
    baseW = baseH * imgAspect;
  } else {
    baseW = cw;
    baseH = baseW / imgAspect;
  }

  const scale = 1 + t * 0.09;
  const drawW = baseW * scale;
  const drawH = baseH * scale;
  const panDist = t * 28;

  let panX = 0;
  let panY = 0;
  if (dir === "right") panX = -panDist;
  if (dir === "left") panX = panDist;
  if (dir === "up") panY = panDist;
  if (dir === "down") panY = -panDist;

  const x = (cw - drawW) / 2 + panX;
  const y = (ch - drawH) / 2 + panY;
  ctx.drawImage(source, x, y, drawW, drawH);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  line1: string,
  line2: string,
  alpha: number,
  style: "title" | "chapter" | "closing"
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (style === "title") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, ch * 0.28, cw, ch * 0.44);

    ctx.fillStyle = "#D4AF37";
    ctx.font = "bold 90px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 16;
    ctx.fillText(line1, cw / 2, ch * 0.42);

    ctx.fillStyle = "#f5f0e8";
    ctx.font = "32px Georgia, serif";
    ctx.shadowBlur = 8;
    ctx.fillText(line2, cw / 2, ch * 0.57);
  } else if (style === "chapter") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const bh = 64;
    ctx.fillRect(0, ch - bh - 40, cw, bh);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 12;
    ctx.fillText(line1, cw / 2, ch - 40 - bh / 2);
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = "#D4AF37";
    ctx.font = "bold 72px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 20;
    ctx.fillText(line1, cw / 2, ch * 0.38);

    ctx.fillStyle = "#f5f0e8";
    ctx.font = "28px Georgia, serif";
    ctx.shadowBlur = 8;
    ctx.fillText(line2, cw / 2, ch * 0.52);

    ctx.fillStyle = "rgba(212,175,55,0.7)";
    ctx.font = "22px Georgia, serif";
    ctx.fillText("May 16, 2026", cw / 2, ch * 0.62);
  }

  ctx.restore();
}

function getChapterText(
  elapsed: number,
  total: number
): { line1: string; line2: string; style: "chapter" } | null {
  const pct = elapsed / total;
  if (pct < 0.12) return { line1: "THE BIG DAY", line2: "", style: "chapter" };
  if (pct >= 0.12 && pct < 0.15) return null;
  if (pct >= 0.15 && pct < 0.42) return { line1: "SHE DID IT!", line2: "", style: "chapter" };
  if (pct >= 0.42 && pct < 0.45) return null;
  if (pct >= 0.45 && pct < 0.68) return { line1: "SURROUNDED BY LOVE", line2: "", style: "chapter" };
  if (pct >= 0.68 && pct < 0.71) return null;
  if (pct >= 0.71 && pct < 0.88) return { line1: "A SURPRISE FROM DANIELLE", line2: "", style: "chapter" };
  return null;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function setupVideoElement(
  file: File,
  audioCtx: AudioContext,
  videoGain: GainNode
): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.src = url;
    vid.muted = true;
    vid.crossOrigin = "anonymous";
    vid.preload = "auto";
    vid.oncanplay = () => {
      try {
        const src = audioCtx.createMediaElementSource(vid);
        src.connect(videoGain);
      } catch {
        // already connected or no audio track
      }
      resolve(vid);
    };
    vid.onerror = reject;
    vid.load();
  });
}

async function renderFrames(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  audioCtx: AudioContext,
  videoGain: GainNode,
  sorted: MediaFileItem[],
  timeline: Timeline,
  onProgress: (pct: number) => void,
  onStatus: (msg: string) => void
): Promise<void> {
  const cw = canvas.width;
  const ch = canvas.height;
  const totalDuration = timeline.totalDuration;

  return new Promise<void>((resolve) => {
    let elapsed = 0;

    // Opening title card (10 seconds)
    const OPENING_DUR = 10;

    // Preload queue — load next item while current is displaying
    const preloadCache = new Map<number, HTMLImageElement | HTMLVideoElement>();
    let activeVideoAudio: HTMLVideoElement | null = null;

    const preloadItem = async (idx: number) => {
      if (idx < 0 || idx >= sorted.length || preloadCache.has(idx)) return;
      const item = sorted[idx];
      if (item.type === "image") {
        const img = await loadImage(item.file);
        preloadCache.set(idx, img);
      } else {
        const vid = await setupVideoElement(item.file, audioCtx, videoGain);
        preloadCache.set(idx, vid);
      }
    };

    // Preload first 3 items
    preloadItem(0);
    preloadItem(1);
    preloadItem(2);

    let intervalId: ReturnType<typeof setInterval>;

    const tick = () => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, cw, ch);

      if (elapsed < OPENING_DUR) {
        // Title card
        const t = elapsed / OPENING_DUR;
        const fadeAlpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
        drawText(ctx, cw, ch, "HAYLEE", "Class of 2026  ·  May 16, 2026", fadeAlpha, "title");
      } else if (elapsed >= timeline.totalDuration - 10) {
        // Closing card
        const closingElapsed = elapsed - (timeline.totalDuration - 10);
        const t = closingElapsed / 10;
        const fadeAlpha = t < 0.2 ? t / 0.2 : t > 0.85 ? (1 - t) / 0.15 : 1;
        drawText(ctx, cw, ch, "CONGRATULATIONS HAYLEE", "With Love, Your Family  ♥", fadeAlpha, "closing");
      } else {
        // Find current timeline item
        const itemIdx = timeline.items.findIndex(
          (ti) => elapsed >= ti.startTime && elapsed < ti.startTime + ti.duration
        );

        if (itemIdx >= 0) {
          const ti = timeline.items[itemIdx];
          const localT = (elapsed - ti.startTime) / ti.duration;
          const elem = preloadCache.get(itemIdx);

          if (elem) {
            const isVid = ti.fileItem.type === "video";

            if (isVid) {
              const vid = elem as HTMLVideoElement;
              if (activeVideoAudio !== vid) {
                activeVideoAudio?.pause();
                activeVideoAudio = vid;
                vid.currentTime = 0;
                vid.play().catch(() => {});
              }
              if (!vid.paused && vid.readyState >= 2) {
                drawCover(ctx, cw, ch, vid, vid.videoWidth || 1280, vid.videoHeight || 720, localT, ti.fileItem.kenBurnsDir);
              }
            } else {
              const img = elem as HTMLImageElement;
              if (activeVideoAudio) {
                activeVideoAudio.pause();
                activeVideoAudio = null;
              }
              drawCover(ctx, cw, ch, img, img.naturalWidth, img.naturalHeight, localT, ti.fileItem.kenBurnsDir);
            }

            // Fade transition
            const fadeIn = Math.min(localT / 0.08, 1);
            const fadeOut = localT > 0.92 ? Math.min((localT - 0.92) / 0.08, 1) : 0;
            const dimAlpha = 1 - Math.max(0, 1 - fadeIn) - fadeOut;
            if (dimAlpha < 0.99) {
              ctx.save();
              ctx.globalAlpha = 1 - dimAlpha;
              ctx.fillStyle = "#0a0a0a";
              ctx.fillRect(0, 0, cw, ch);
              ctx.restore();
            }

            // Preload upcoming items
            preloadItem(itemIdx + 1);
            preloadItem(itemIdx + 2);
          }

          // Chapter text
          const chap = getChapterText(elapsed, totalDuration);
          if (chap) {
            const chapAlpha = localT < 0.15 ? localT / 0.15 : localT > 0.75 ? (1 - localT) / 0.25 : 1;
            drawText(ctx, cw, ch, chap.line1, chap.line2, chapAlpha, "chapter");
          }
        }
      }

      elapsed += FRAME_MS / 1000;
      onProgress(Math.min(99, (elapsed / totalDuration) * 100));

      if (elapsed >= totalDuration) {
        clearInterval(intervalId);
        activeVideoAudio?.pause();
        resolve();
      }
    };

    intervalId = setInterval(tick, FRAME_MS);
    onStatus("Rendering your video frame by frame...");
  });
}

export function useGraduationVideo() {
  const createVideo = useCallback(
    async (options: CreateVideoOptions): Promise<string> => {
      const { mediaFiles, pompFile, vibesFile, onProgress, onStatus } = options;

      onStatus("Sorting your photos and videos...");
      const sorted = sortAndTagFiles(mediaFiles);
      if (sorted.length === 0) throw new Error("No supported photos or videos found.");

      const timeline = buildTimeline(sorted, 180);

      onStatus("Setting up the canvas...");
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d")!;

      onStatus("Loading music...");
      const audioCtx = new AudioContext();
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      const audioDestination = audioCtx.createMediaStreamDestination();
      masterGain.connect(audioDestination);

      const videoGain = audioCtx.createGain();
      videoGain.gain.value = 1.0;
      videoGain.connect(masterGain);

      const musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.45;
      musicGain.connect(masterGain);

      const now = audioCtx.currentTime;

      if (pompFile) {
        try {
          const buf = await loadAudioBuffer(audioCtx, pompFile);
          const src = audioCtx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.connect(musicGain);
          src.start(now);
        } catch {
          // skip bad audio file
        }
      }

      if (vibesFile) {
        try {
          const buf = await loadAudioBuffer(audioCtx, vibesFile);
          const src = audioCtx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          const vibesGain = audioCtx.createGain();
          vibesGain.gain.value = 0;
          vibesGain.gain.linearRampToValueAtTime(0.35, now + timeline.totalDuration * 0.18);
          src.connect(vibesGain);
          vibesGain.connect(masterGain);
          src.start(now + timeline.totalDuration * 0.1);
        } catch {
          // skip bad audio file
        }
      }

      const videoStream = canvas.captureStream(FPS);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start(500);

      await renderFrames(ctx, canvas, audioCtx, videoGain, sorted, timeline, onProgress, onStatus);

      recorder.stop();
      audioCtx.close();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      onProgress(100);
      onStatus("Packaging your video...");

      const blob = new Blob(chunks, { type: mimeType });
      return URL.createObjectURL(blob);
    },
    []
  );

  return { createVideo };
}
