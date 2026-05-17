import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Check, Loader2, Trash2, Sparkles, Copy, ChevronDown, ChevronUp,
  Clapperboard, AlertCircle, ExternalLink
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://record-reward-backend.texasfreelancewriter.workers.dev";

interface Shot {
  id: string;
  title: string;
  instruction: string;
  suggestedDuration: number;
  required: boolean;
}

interface Template {
  id: string;
  name: string;
  shots: Shot[];
}

interface Asset {
  id: string;
  shotId: string;
  url: string;
  originalName: string;
  mimeType: string;
}

interface Project {
  id: string;
  businessName: string;
  location: string;
  tagline: string;
  status: string;
  templateId: string;
}

interface OutputPlan {
  format: string;
  durationSeconds: number;
  width: number;
  height: number;
  aiPrompt: string;
}

interface VideoPlan {
  businessName: string;
  templateName: string;
  musicStyle: string;
  outputPlans: OutputPlan[];
}

interface ProjectData {
  project: Project;
  template: Template | null;
  assets: Asset[];
  plan: VideoPlan | null;
}

// ---------------------------------------------------------------------------
// ShotCard
// ---------------------------------------------------------------------------

function ShotCard({
  shot,
  asset,
  onUpload,
  onDelete,
}: {
  shot: Shot;
  asset?: Asset;
  onUpload: (shotId: string, file: File) => Promise<void>;
  onDelete: (assetId: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isVideo = asset?.mimeType?.startsWith("video/");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(shot.id, file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!asset) return;
    setDeleting(true);
    try {
      await onDelete(asset.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className={`transition-all ${asset ? "border-primary/40" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Thumbnail / placeholder */}
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
            {asset ? (
              isVideo ? (
                <video src={asset.url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={asset.url} alt={shot.title} className="w-full h-full object-cover" />
              )
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground/40" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{shot.title}</span>
              {shot.required && !asset ? (
                <span className="text-xs text-amber-500 font-medium">Required</span>
              ) : null}
              {asset ? <Check className="h-4 w-4 text-primary shrink-0" /> : null}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{shot.instruction}</p>
            <p className="text-xs text-muted-foreground/50 mt-1">{shot.suggestedDuration}s suggested</p>

            {asset ? (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs gap-1"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFile}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PlanOutputCard
// ---------------------------------------------------------------------------

function PlanOutputCard({ plan }: { plan: OutputPlan }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(plan.aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{plan.format}</CardTitle>
            <CardDescription>{plan.durationSeconds}s · {plan.width}×{plan.height}</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => setExpanded((e) => !e)} className="h-8 w-8">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent className="pt-0">
          <div className="bg-muted rounded-lg p-4 mb-3 text-sm font-mono leading-relaxed text-foreground/80 whitespace-pre-wrap">
            {plan.aiPrompt}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Prompt"}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CommercialProjectPage
// ---------------------------------------------------------------------------

export default function CommercialProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["commercial-project", id],
    queryFn: () => api.get<ProjectData>(`/api/commercials/projects/${id}`),
    enabled: !!id,
  });

  const project = data?.project;
  const template = data?.template;
  const assets = data?.assets ?? [];
  const plan = data?.plan;

  const assetsByShot = new Map((assets).map((a) => [a.shotId, a]));
  const requiredShots = template?.shots.filter((s) => s.required) ?? [];
  const uploadedRequired = requiredShots.filter((s) => assetsByShot.has(s.id));
  const allReady = uploadedRequired.length === requiredShots.length && requiredShots.length > 0;

  async function handleUpload(shotId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shotId", shotId);

    const res = await fetch(`${API_BASE_URL}/api/commercials/projects/${id}/assets`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) throw new Error("Upload failed");
    await refetch();
  }

  async function handleDelete(assetId: string) {
    await api.delete(`/api/commercials/projects/${id}/assets/${assetId}`);
    await refetch();
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.post(`/api/commercials/projects/${id}/generate`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["commercial-projects"] });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteProject() {
    if (!confirm(`Delete "${project?.businessName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/commercials/projects/${id}`);
      queryClient.invalidateQueries({ queryKey: ["commercial-projects"] });
      navigate("/commercial");
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!project || !template) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Project not found</p>
          <Link to="/commercial" className="text-sm text-primary mt-2 inline-block">← Back to Commercials</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link to="/commercial" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
            ← Commercials
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Clapperboard className="h-7 w-7 text-primary" />
                {project.businessName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {project.location ? <span className="text-muted-foreground text-sm">{project.location}</span> : null}
                {project.tagline ? <span className="text-muted-foreground/60 text-sm italic">"{project.tagline}"</span> : null}
              </div>
              <p className="text-xs text-muted-foreground/50 mt-1">Template: {template.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteProject}
              disabled={deleting}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Shot uploads</span>
            <span>{uploadedRequired.length} / {requiredShots.length} required shots</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: requiredShots.length > 0 ? `${(uploadedRequired.length / requiredShots.length) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* Shot grid */}
        <div className="grid gap-3 mb-8">
          {template.shots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              asset={assetsByShot.get(shot.id)}
              onUpload={handleUpload}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Generate button */}
        {!plan ? (
          <div className="mb-8">
            {!allReady ? (
              <div className="flex items-center gap-2 text-sm text-amber-500 mb-3">
                <AlertCircle className="h-4 w-4" />
                Upload all {requiredShots.length} required shots to generate
              </div>
            ) : null}
            <Button
              disabled={!allReady || generating}
              onClick={handleGenerate}
              className="w-full gap-2 h-12 text-base"
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {generating ? "Generating Plan…" : "Generate Commercial Plan"}
            </Button>
          </div>
        ) : null}

        {/* Video Plan */}
        {plan ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Commercial Plan Ready
              </h2>
              <div className="flex gap-2">
                <Badge variant="default">Complete</Badge>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Regenerate
                </Button>
              </div>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border border-border mb-6 text-sm space-y-1">
              <p><span className="text-muted-foreground">Business:</span> <span className="font-medium">{plan.businessName}</span></p>
              <p><span className="text-muted-foreground">Template:</span> <span className="font-medium">{plan.templateName}</span></p>
              <p><span className="text-muted-foreground">Music:</span> <span className="font-medium">{plan.musicStyle}</span></p>
            </div>

            <div className="grid gap-4 mb-8">
              {plan.outputPlans.map((op, i) => (
                <PlanOutputCard key={i} plan={op} />
              ))}
            </div>

            {/* Shotstack CTA */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  Ready to render?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Copy a prompt above and paste it into Runway, Kling AI, or Veo — or use Shotstack to programmatically assemble your uploaded assets into a finished MP4.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <a href="https://shotstack.io" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Shotstack
                    </Button>
                  </a>
                  <a href="https://runwayml.com" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Runway
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
