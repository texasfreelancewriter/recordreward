import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Upload, Zap, FileText, CheckCircle,
  Clock, Video, User, RefreshCw, Database, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InterviewSummary {
  id: string;
  userName: string;
  userEmail: string;
  title: string;
  status: string;
}

interface GameSession {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  status: string;
  transcript: string | null;
  recapStory: string | null;
  deadline: string | null;
  interviews: InterviewSummary[];
}

const STEPS = [
  { key: "pending", label: "Upload Transcript", icon: Upload },
  { key: "analyzed", label: "Interviews Sent", icon: Video },
  { key: "recap_ready", label: "Recap Ready", icon: FileText },
  { key: "published", label: "Published", icon: CheckCircle },
];

export default function GameSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [deadlineHours, setDeadlineHours] = useState(2);
  const [espnStatus, setEspnStatus] = useState<"idle" | "found" | "not-found">("idle");

  const { data: session, isLoading } = useQuery({
    queryKey: ["game-session", id],
    queryFn: () => api.get<GameSession>(`/api/game-sessions/${id}`),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const analyzeMutation = useMutation({
    mutationFn: () =>
      api.post<{ stars: unknown[]; espnFound?: boolean }>(`/api/game-sessions/${id}/analyze`, {
        transcript,
        deadlineHours,
        extraContext: extraContext.trim() || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["game-session", id] });
      setEspnStatus("idle");
      toast({ title: "Stars identified! Interviews created." });
    },
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const recapMutation = useMutation({
    mutationFn: () => api.post(`/api/game-sessions/${id}/generate-recap`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-session", id] });
      toast({ title: "Recap story generated!" });
    },
    onError: () => toast({ title: "Recap generation failed", variant: "destructive" }),
  });

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const statusIndex = STEPS.findIndex((s) => s.key === session.status);
  const completedInterviews = session.interviews.filter((i) => i.status === "recorded").length;
  const totalInterviews = session.interviews.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate("/sid/games")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Games
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            {session.awayTeam} <span className="text-gray-400">at</span> {session.homeTeam}
          </h1>
          <p className="text-gray-400 mt-1 capitalize">
            {session.sport} · {new Date(session.gameDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i <= statusIndex;
            const active = i === statusIndex + 1 || (statusIndex === -1 && i === 0);
            return (
              <div key={step.key} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  done ? "bg-blue-600 text-white" : active ? "bg-gray-700 text-gray-200 border border-blue-500" : "bg-gray-800 text-gray-500"
                }`}>
                  <Icon className="h-3 w-3" />
                  {step.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-6 ${done ? "bg-blue-600" : "bg-gray-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload transcript */}
        {session.status === "pending" && (
          <div className="space-y-4">
            {/* Transcript */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-400" />
                Broadcast Transcript
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Paste the full broadcast transcript. Claude will identify the stars and auto-generate interview questions.
              </p>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste game broadcast transcript here — play-by-play, color commentary, post-game coverage..."
                className="bg-gray-900 border-gray-600 text-white min-h-48"
              />
            </div>

            {/* Additional context */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                Additional Context
                <span className="text-xs font-normal text-gray-500 ml-1">optional</span>
              </h2>
              <div className="flex items-start gap-2 bg-blue-950/40 border border-blue-800/40 rounded-lg p-3 mb-4">
                <Database className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300 leading-relaxed">
                  For <strong>NFL, NBA, MLB, NHL, MLS, and college sports</strong> — ESPN box score data is fetched automatically when you analyze. For minor leagues, high school, or other sports, paste a box score, MaxPreps stats, or any game notes below to improve accuracy.
                </p>
              </div>
              <Textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="Paste box score, MaxPreps stats, game notes, press release, or any additional data here..."
                className="bg-gray-900 border-gray-600 text-white min-h-28"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Response deadline:</label>
                <select
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(Number(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={24}>24 hours</option>
                </select>
              </div>
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={transcript.length < 50 || analyzeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 gap-2 ml-auto"
              >
                <Zap className="h-4 w-4" />
                {analyzeMutation.isPending ? "Fetching data & analyzing..." : "Identify Stars & Send Interviews"}
              </Button>
            </div>

            {analyzeMutation.isPending && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Checking ESPN for box score data, then running AI analysis...
              </div>
            )}
          </div>
        )}

        {/* Step 2: Interviews in progress */}
        {["analyzed", "interviewing"].includes(session.status) && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-400" />
                  Interviews
                </h2>
                <span className="text-sm text-gray-400">
                  {completedInterviews} of {totalInterviews} recorded
                </span>
              </div>

              {session.deadline && (
                <div className="flex items-center gap-2 text-sm text-yellow-400 mb-4">
                  <Clock className="h-4 w-4" />
                  Deadline: {new Date(session.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}

              <div className="space-y-2">
                {session.interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-sm">{interview.userName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`text-xs border-0 ${
                          interview.status === "recorded"
                            ? "bg-green-600 text-white"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {interview.status === "recorded" ? "Recorded" : "Pending"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-gray-600"
                        onClick={() => navigate(`/interviews/${interview.id}/record`)}
                      >
                        {interview.status === "recorded" ? "View" : "Record"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {completedInterviews > 0 && (
              <Button
                onClick={() => recapMutation.mutate()}
                disabled={recapMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-500 gap-2"
              >
                <FileText className="h-4 w-4" />
                {recapMutation.isPending ? "Writing recap..." : "Generate Recap Story"}
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Recap ready */}
        {["recap_ready", "published"].includes(session.status) && session.recapStory && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-400" />
                  Game Recap Story
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-xs gap-1"
                  onClick={() => navigator.clipboard.writeText(session.recapStory!)}
                >
                  Copy
                </Button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                {session.recapStory.split("\n").map((para, i) =>
                  para.trim() ? (
                    <p key={i} className="text-gray-200 leading-relaxed mb-3">
                      {para}
                    </p>
                  ) : null
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-400" />
                Interview Clips
              </h2>
              <div className="space-y-2">
                {session.interviews.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium">{interview.userName}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-gray-600"
                      onClick={() => navigate(`/interviews/${interview.id}`)}
                    >
                      View Clips
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-4">
                Social media publishing coming soon — X and Instagram integration
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
