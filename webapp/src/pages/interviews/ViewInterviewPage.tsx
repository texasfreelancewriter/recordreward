import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  ArrowLeft,
  Video,
  Clock,
  CheckCircle,
  User,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Interview } from "@/types/interviews";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteInterviewDialog } from "@/components/interviews/DeleteInterviewDialog";

export default function ViewInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchedPercent, setWatchedPercent] = useState<number>(0);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const { data: interview, isLoading, error } = useQuery({
    queryKey: ["interview", id],
    queryFn: () => api.get<Interview>(`/api/interviews/${id}`),
    enabled: !!id,
  });

  const clips = interview?.clips || [];
  const questions = interview?.questions || [];

  const statusConfig = {
    pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
    recorded: { label: "Recorded", variant: "default" as const, icon: Video },
    published: { label: "Published", variant: "default" as const, icon: CheckCircle },
    pending_approval: { label: "Pending Approval", variant: "secondary" as const, icon: Clock },
    dismissed: { label: "Dismissed", variant: "secondary" as const, icon: Video },
  };

  const status = interview ? statusConfig[interview.status] || statusConfig.pending : statusConfig.pending;
  const StatusIcon = status.icon;

  const playClip = (index: number) => {
    if (clips[index]) {
      setCurrentClipIndex(index);
      setWatchedPercent(0);
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setWatchedPercent((prev) => Math.max(prev, pct));
    }
  };

  const handleApprove = async () => {
    if (!id || watchedPercent < 75) return;
    setIsApproving(true);
    try {
      await api.patch(`/api/interviews/${id}`, { status: "recorded" });
      queryClient.invalidateQueries({ queryKey: ["interview", id] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    } finally {
      setIsApproving(false);
    }
  };

  const playAll = () => {
    if (clips.length > 0) {
      playClip(0);
    }
  };

  const handleVideoEnded = () => {
    if (currentClipIndex !== null && currentClipIndex < clips.length - 1) {
      playClip(currentClipIndex + 1);
    } else {
      setIsPlaying(false);
      setCurrentClipIndex(null);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="aspect-video w-full rounded-lg mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-12">
          <p className="text-destructive mb-4">Failed to load interview</p>
          <Button onClick={() => navigate("/interviews")} variant="outline">
            Back to Interviews
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/interviews")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{interview.title}</h1>
              <Badge variant={status.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
            {interview.user ? (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <User className="h-4 w-4" />
                {interview.user.name}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {interview.status === "pending" && questions.length > 0 ? (
              <Link to={`/interviews/${id}/record`}>
                <Button className="gap-2">
                  <Video className="h-4 w-4" />
                  Record Interview
                </Button>
              </Link>
            ) : null}
            {interview.status === "pending_approval" ? (
              <Button
                onClick={handleApprove}
                disabled={watchedPercent < 75 || isApproving}
                className="gap-2"
                title={watchedPercent < 75 ? "Watch at least 75% of the video to approve" : "Approve this submission"}
              >
                <CheckCircle className="h-4 w-4" />
                {isApproving ? "Approving..." : watchedPercent < 75 ? `Watch ${Math.round(75 - watchedPercent)}% more` : "Approve"}
              </Button>
            ) : null}
            <DeleteInterviewDialog
              interviewId={interview.id}
              interviewTitle={interview.title}
              trigger={
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>

        {/* Video Player */}
        {clips.length > 0 ? (
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              {currentClipIndex !== null ? (
                <video
                  ref={videoRef}
                  style={{ width: "100%", maxHeight: "80vh", display: "block" }}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  controls
                  src={clips[currentClipIndex]?.videoUrl}
                  autoPlay
                />
              ) : (
                <div
                  className="aspect-video flex flex-col items-center justify-center bg-black/90 cursor-pointer"
                  onClick={playAll}
                >
                  <Button size="lg" className="gap-2" onClick={playAll}>
                    <Play className="h-5 w-5" />
                    Play All
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-3 gap-2">
              {clips.map((clip, i) => {
                const isStreamUrl = clip.videoUrl.includes("videodelivery.net");
                const ageMs = Date.now() - new Date(clip.createdAt).getTime();
                const isProcessing = isStreamUrl && ageMs < 2 * 60 * 1000;
                return isProcessing ? (
                  <Button key={clip.id} variant="outline" size="sm" className="gap-2" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </Button>
                ) : (
                  <a
                    key={clip.id}
                    href={clip.videoUrl}
                    download={`interview-clip-${i + 1}.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      {clips.length > 1 ? `Download Clip ${i + 1}` : "Download MP4"}
                    </Button>
                  </a>
                );
              })}
            </div>
            {currentClipIndex !== null ? (
              <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                <span>
                  Playing clip {currentClipIndex + 1} of {clips.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayPause}
                  className="gap-1"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Resume
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

      </div>
    </div>
  );
}
