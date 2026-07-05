import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Video, CheckCircle, Clock, User, Calendar, Trash2, Copy, Check, LogOut, Building2, PlusCircle, Upload, Loader2, Clapperboard, Plus, X, ShieldCheck, Gift, AlertCircle, TicketCheck, TrendingUp, Pencil, Download, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { Interview } from "@/types/interviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteInterviewDialog } from "@/components/interviews/DeleteInterviewDialog";
import { DeleteBusinessDialog } from "@/components/admin/DeleteBusinessDialog";
import { signOut, useSession } from "@/lib/auth-client";
import { useOrg, useOrgs, setSelectedOrgId } from "@/hooks/useOrg";
import {
  fetchServerConfig,
  saveServerConfig,
  getConfig,
  TemplateConfig,
  SocialMediaConfig,
} from "@/lib/template-config";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ---------------------------------------------------------------------------
// DashboardHeader
// ---------------------------------------------------------------------------

function DashboardHeader() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex items-center gap-3">
      {session?.user?.email ? (
        <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[200px]">
          {session.user.email}
        </span>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InterviewCard
// ---------------------------------------------------------------------------

function InterviewCard({ interview, onDelete }: { interview: Interview; onDelete: () => void }) {
  const statusConfig = {
    pending: { label: "Pending", variant: "secondary" as const, icon: Video },
    recorded: { label: "Recorded", variant: "default" as const, icon: Video },
    published: { label: "Published", variant: "default" as const, icon: CheckCircle },
    pending_approval: { label: "Pending Approval", variant: "secondary" as const, icon: Clock },
    dismissed: { label: "Dismissed", variant: "secondary" as const, icon: Video },
  };

  const status = statusConfig[interview.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="hover:border-primary/50 hover:shadow-md transition-all group relative">
      <Link to={`/interviews/${interview.id}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-1 pr-8">{interview.title}</CardTitle>
            <Badge variant={status.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {interview.user ? (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{interview.user.name}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(interview.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Link>
      <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
        <DeleteInterviewDialog
          interviewId={interview.id}
          interviewTitle={interview.title}
          onSuccess={onDelete}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </Card>
  );
}

function InterviewCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// InterviewsTab
// ---------------------------------------------------------------------------

function InterviewsTab() {
  const { data: org } = useOrg();
  const orgId = org?.id;
  const { data: interviews, isLoading, error, refetch } = useQuery({
    queryKey: ["interviews", orgId],
    queryFn: () => api.get<Interview[]>(orgId ? `/api/interviews?orgId=${orgId}` : "/api/interviews"),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive mb-4">Failed to load interviews</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <InterviewCardSkeleton />
        <InterviewCardSkeleton />
        <InterviewCardSkeleton />
      </div>
    );
  }

  if (!interviews || interviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Video className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No interviews yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Interviews will appear here after customers use the kiosk
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {interviews.map((interview) => (
        <InterviewCard key={interview.id} interview={interview} onDelete={() => refetch()} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsTab
// ---------------------------------------------------------------------------

const SOCIAL_PLATFORMS: { key: keyof SocialMediaConfig; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@yourinstagramhandle" },
  { key: "twitter", label: "Twitter / X", placeholder: "@yourtwitterhandle" },
  { key: "tiktok", label: "TikTok", placeholder: "@yourtiktokhandle" },
  { key: "facebook", label: "Facebook", placeholder: "@yourfacebookpage" },
  { key: "youtube", label: "YouTube", placeholder: "@youryoutubechannel" },
];

function SettingsTab() {
  const navigate = useNavigate();
  const { data: org } = useOrg();
  const { data: orgs } = useOrgs();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [draft, setDraft] = useState<TemplateConfig>({ ...getConfig() });
  const bgFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteSent, setInviteSent] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string>("");

  const isOwner = org?.role === "owner";
  const kioskUrl = org?.slug ? `${window.location.origin}/kiosk/${org.slug}` : null;

  async function handleInvite() {
    if (!org?.id || !inviteEmail) return;
    setInviting(true);
    setInviteError("");
    try {
      await api.post("/api/invites", { email: inviteEmail, orgId: org.id });
      setInviteSent(true);
      setInviteEmail("");
      setTimeout(() => setInviteSent(false), 4000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  }

  useEffect(() => {
    if (!org?.id) return;
    fetchServerConfig(org.id).then((c) => {
      if (c) setDraft(c);
    });
  }, [org?.id]);

  function handleCopy() {
    if (!kioskUrl) return;
    navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveServerConfig(draft, org?.id);
    } finally {
      setSaving(false);
    }
  }

  function handleOrgSwitch(orgId: string) {
    setSelectedOrgId(orgId);
    queryClient.setQueryData(["selectedOrgId"], orgId);
    const newOrg = orgs?.find((o) => o.id === orgId);
    if (newOrg) {
      fetchServerConfig(newOrg.id).then((c) => {
        if (c) setDraft(c);
        else setDraft({ ...getConfig() });
      });
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function setDraftField<K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setSocialField(key: keyof SocialMediaConfig, value: string) {
    setDraft((prev) => ({
      ...prev,
      socialMedia: { ...prev.socialMedia, [key]: value },
    }));
  }

  async function handleImageUpload(
    file: File,
    field: "backgroundImage" | "logoImage",
    setUploading: (v: boolean) => void
  ) {
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setDraftField(field, result.url);
    } catch {
      // silently ignore, user can try again
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Kiosk URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kiosk URL</CardTitle>
          <CardDescription>
            Share this link with customers so they can leave video feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kioskUrl ? (
            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={kioskUrl}
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
                title="Copy URL"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Skeleton className="h-9 w-full" />
          )}
        </CardContent>
      </Card>

      {/* Invite Client — owners only */}
      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite Client</CardTitle>
            <CardDescription>Give the business owner access to their interviews and settings.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="client@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" ? handleInvite() : null}
              />
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="shrink-0">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </div>
            {inviteSent ? <p className="text-sm text-green-600">Invite sent!</p> : null}
            {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how your kiosk looks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backgroundImage">Background Image</Label>
            <div className="flex gap-2">
              <Input
                id="backgroundImage"
                value={draft.backgroundImage}
                onChange={(e) => setDraftField("backgroundImage", e.target.value)}
                placeholder="Paste URL or upload →"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={uploadingBg}
                onClick={() => bgFileRef.current?.click()}
                title="Upload from device"
              >
                {uploadingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              <input
                ref={bgFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "backgroundImage", setUploadingBg);
                  e.target.value = "";
                }}
              />
            </div>
            {draft.backgroundImage ? (
              <div className="h-20 rounded-md overflow-hidden border border-border bg-muted">
                <img src={draft.backgroundImage} alt="Background preview" className="w-full h-full object-cover" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logoImage">Logo Image</Label>
            <div className="flex gap-2">
              <Input
                id="logoImage"
                value={draft.logoImage}
                onChange={(e) => setDraftField("logoImage", e.target.value)}
                placeholder="Paste URL or upload →"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={uploadingLogo}
                onClick={() => logoFileRef.current?.click()}
                title="Upload from device"
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "logoImage", setUploadingLogo);
                  e.target.value = "";
                }}
              />
            </div>
            {draft.logoImage ? (
              <div className="h-20 rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center p-2">
                <img src={draft.logoImage} alt="Logo preview" className="max-h-full max-w-full object-contain" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="heroText">Camera Screen Heading</Label>
            <Input
              id="heroText"
              value={draft.heroText ?? "Tell Us About Your Visit"}
              onChange={(e) => setDraftField("heroText", e.target.value)}
              placeholder="Tell Us About Your Visit"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="emailEnabled">Collect Email Address</Label>
            <button
              id="emailEnabled"
              type="button"
              role="switch"
              aria-checked={draft.emailEnabled ?? true}
              onClick={() => setDraftField("emailEnabled", !(draft.emailEnabled ?? true))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                (draft.emailEnabled ?? true) ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  (draft.emailEnabled ?? true) ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="starRatingEnabled">Show Star Rating</Label>
            <button
              id="starRatingEnabled"
              type="button"
              role="switch"
              aria-checked={draft.starRatingEnabled ?? false}
              onClick={() => setDraftField("starRatingEnabled", !(draft.starRatingEnabled ?? false))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                (draft.starRatingEnabled ?? false) ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  (draft.starRatingEnabled ?? false) ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="rewardEnabled">Offer a Reward</Label>
              <button
                id="rewardEnabled"
                type="button"
                role="switch"
                aria-checked={draft.rewardEnabled ?? true}
                onClick={() => setDraftField("rewardEnabled", !(draft.rewardEnabled ?? true))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  (draft.rewardEnabled ?? true) ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    (draft.rewardEnabled ?? true) ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {(draft.rewardEnabled ?? true) ? (
              <Input
                id="rewardText"
                value={draft.rewardText}
                onChange={(e) => setDraftField("rewardText", e.target.value)}
                placeholder="e.g. Free Appetizer, 10% Off, Free Dessert"
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kiosk Buttons & Questions</CardTitle>
          <CardDescription>Control which buttons appear and what questions customers are asked.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {(["first_time", "return"] as const).map((btnId) => {
            const btn = draft.buttons.find((b) => b.id === btnId) ?? draft.buttons[0];
            const btnLabel = btnId === "first_time" ? "First Time Button" : "Return Visit Button";
            const questions = btn.questions ?? [];
            return (
              <div key={btnId} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{btnLabel}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={btn.enabled !== false}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        buttons: prev.buttons.map((b) =>
                          b.id === btnId ? { ...b, enabled: b.enabled === false ? true : false } : b
                        ),
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      btn.enabled !== false ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        btn.enabled !== false ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Button Label</Label>
                  <Input
                    value={btn.label}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        buttons: prev.buttons.map((b) =>
                          b.id === btnId ? { ...b, label: e.target.value } : b
                        ),
                      }))
                    }
                    placeholder="e.g. First Time"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Questions</Label>
                  {questions.map((q, qIdx) => (
                    <div key={qIdx} className="flex gap-2 items-start">
                      <textarea
                        value={q}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            buttons: prev.buttons.map((b) => {
                              if (b.id !== btnId) return b;
                              const updated = [...(b.questions ?? [])];
                              updated[qIdx] = e.target.value;
                              return { ...b, questions: updated };
                            }),
                          }))
                        }
                        rows={2}
                        placeholder="Question shown to the customer while recording"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            buttons: prev.buttons.map((b) => {
                              if (b.id !== btnId) return b;
                              const updated = (b.questions ?? []).filter((_, i) => i !== qIdx);
                              return { ...b, questions: updated };
                            }),
                          }))
                        }
                        className="mt-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove question"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        buttons: prev.buttons.map((b) => {
                          if (b.id !== btnId) return b;
                          return { ...b, questions: [...(b.questions ?? []), ""] };
                        }),
                      }))
                    }
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1 w-fit"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social Media</CardTitle>
          <CardDescription>
            Enter your handles so staff can quickly navigate to your accounts when sharing clips.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`social-${key}`}>{label}</Label>
              <Input
                id={`social-${key}`}
                value={draft.socialMedia?.[key] ?? ""}
                onChange={(e) => setSocialField(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {isOwner ? (
          <Link
            to="/setup"
            className="w-full text-center px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted transition-all block"
          >
            <PlusCircle className="h-4 w-4 inline mr-2" />
            Add New Business
          </Link>
        ) : null}
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminTab
// ---------------------------------------------------------------------------

function AdminTab() {
  const { data: org } = useOrg();
  const { data: orgs, refetch } = useOrgs();
  const queryClient = useQueryClient();
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [savingName, setSavingName] = useState<boolean>(false);

  const isOwner = org?.role === "owner";

  async function handleSaveName(orgId: string) {
    if (!editingName.trim()) return;
    setSavingName(true);
    try {
      await api.patch(`/api/organizations/${orgId}`, { name: editingName.trim() });
      await refetch();
      setEditingOrgId(null);
    } finally {
      setSavingName(false);
    }
  }

  function handleBusinessDeleted(deletedOrgId: string) {
    // If the deleted org was selected, switch to another one
    if (org?.id === deletedOrgId) {
      const remaining = (orgs ?? []).filter((o) => o.id !== deletedOrgId);
      if (remaining.length > 0) {
        setSelectedOrgId(remaining[0].id);
        queryClient.setQueryData(["selectedOrgId"], remaining[0].id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
    refetch();
  }

  if (!isOwner) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Admin access required</p>
          <p className="text-sm text-muted-foreground mt-1">Only account owners can manage businesses.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Businesses</h2>
          <p className="text-sm text-muted-foreground">Add or remove client businesses from this account.</p>
        </div>
        <Link to="/setup">
          <Button size="sm" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Business
          </Button>
        </Link>
      </div>

      {/* Business list */}
      {!orgs || orgs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No businesses yet.</p>
            <Link to="/setup" className="mt-3">
              <Button size="sm" variant="outline" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Your First Business
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {orgs.map((o) => (
            <Card key={o.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  {editingOrgId === o.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName(o.id);
                          if (e.key === "Escape") setEditingOrgId(null);
                        }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleSaveName(o.id)} disabled={savingName}>
                        {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingOrgId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/name">
                      <p className="font-medium text-sm truncate">{o.name}</p>
                      <button
                        onClick={() => { setEditingOrgId(o.id); setEditingName(o.name); }}
                        className="opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground truncate">/{o.slug}</p>
                </div>
              </div>
              <DeleteBusinessDialog
                orgId={o.id}
                orgName={o.name}
                onSuccess={() => handleBusinessDeleted(o.id)}
              />
            </Card>
          ))}
        </div>
      )}

      {/* Danger zone note */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Deleting a business permanently removes it and all its interviews. This cannot be undone.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CouponsTab
// ---------------------------------------------------------------------------

function exportCouponsCSV(coupons: CouponSummary[]) {
  const header = "Code,Customer,Reward,Status,Issued,Expires,Redeemed";
  const rows = coupons.map((c) =>
    [
      c.code,
      c.customerName,
      `"${c.rewardText.replace(/"/g, '""')}"`,
      c.status,
      new Date(c.createdAt).toLocaleDateString(),
      new Date(c.expiresAt).toLocaleDateString(),
      c.redeemedAt ? new Date(c.redeemedAt).toLocaleDateString() : "",
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "coupons.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type CouponSummary = {
  id: string;
  code: string;
  rewardText: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  customerName: string;
  status: "valid" | "redeemed" | "expired";
};

type CouponsData = {
  coupons: CouponSummary[];
  stats: { total: number; redeemed: number; expired: number; valid: number };
};

function CouponsTab() {
  const { data: org } = useOrg();
  const orgId = org?.id;
  const [filter, setFilter] = useState<"all" | "valid" | "redeemed" | "expired">("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["coupons", orgId],
    queryFn: () => api.get<CouponsData>(`/api/coupons?orgId=${orgId}`),
    enabled: !!orgId,
  });

  const filtered = (data?.coupons ?? []).filter(
    (c) => filter === "all" || c.status === filter
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive mb-4">Failed to load coupons</p>
      </div>
    );
  }

  const stats = data?.stats ?? { total: 0, redeemed: 0, expired: 0, valid: 0 };
  const redemptionRate = stats.total > 0 ? Math.round((stats.redeemed / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Issued</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.valid}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Redeemed</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.redeemed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Redemption Rate</p>
              <p className="text-2xl font-bold">{redemptionRate}%</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {stats.total > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={[
                  { name: "Active", value: stats.valid },
                  { name: "Redeemed", value: stats.redeemed },
                  { name: "Expired", value: stats.expired },
                ]}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#16a34a" />
                  <Cell fill="#2563eb" />
                  <Cell fill="#6b7280" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {/* Filter + Export */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["all", "valid", "redeemed", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f === "all" ? `All (${stats.total})` : f === "valid" ? `Active (${stats.valid})` : f === "redeemed" ? `Redeemed (${stats.redeemed})` : `Expired (${stats.expired})`}
            </button>
          ))}
        </div>
        {(data?.coupons ?? []).length > 0 ? (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => exportCouponsCSV(filtered)}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        ) : null}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TicketCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              {stats.total === 0 ? "No coupons issued yet — they'll appear after customers complete an interview." : "No coupons match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((coupon) => (
            <Card key={coupon.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-sm tracking-widest shrink-0">{coupon.code}</span>
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-sm font-medium truncate">{coupon.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{coupon.rewardText}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-muted-foreground">
                      {coupon.redeemedAt
                        ? `Redeemed ${new Date(coupon.redeemedAt).toLocaleDateString()}`
                        : `Expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued {new Date(coupon.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {coupon.status === "valid" ? (
                    <span className="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">Active</span>
                  ) : coupon.status === "redeemed" ? (
                    <span className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">Redeemed</span>
                  ) : (
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">Expired</span>
                  )}
                </div>
              </div>
              {/* Mobile second row */}
              <div className="sm:hidden mt-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{coupon.customerName}</p>
                  <p className="text-xs text-muted-foreground">{coupon.rewardText}</p>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {coupon.redeemedAt
                    ? `Redeemed ${new Date(coupon.redeemedAt).toLocaleDateString()}`
                    : `Expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RedeemTab
// ---------------------------------------------------------------------------

type CouponLookup = {
  code: string;
  rewardText: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  customerName: string;
  status: "valid" | "redeemed" | "expired";
};

function RedeemTab() {
  const [inputCode, setInputCode] = useState("");
  const [coupon, setCoupon] = useState<CouponLookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const code = inputCode.trim().toUpperCase();
    if (!code) return;
    setLooking(true);
    setLookupError("");
    setCoupon(null);
    setRedeemSuccess(false);
    try {
      const result = await api.get<CouponLookup>(`/api/coupons/${code}`);
      setCoupon(result);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      setLookupError(status === 404 ? "Coupon code not found." : "Error looking up coupon.");
    } finally {
      setLooking(false);
    }
  }

  async function handleRedeem() {
    if (!coupon) return;
    setRedeeming(true);
    try {
      await api.post(`/api/coupons/${coupon.code}/redeem`, {});
      setCoupon({ ...coupon, status: "redeemed", redeemedAt: new Date().toISOString() });
      setRedeemSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to redeem.";
      setLookupError(msg);
    } finally {
      setRedeeming(false);
    }
  }

  function handleReset() {
    setInputCode("");
    setCoupon(null);
    setLookupError("");
    setRedeemSuccess(false);
  }

  return (
    <div className="max-w-md mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <Gift className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Redeem Coupon</h2>
      </div>

      {!coupon ? (
        <form onSubmit={handleLookup} className="space-y-3">
          <div>
            <Label htmlFor="coupon-code">Customer Coupon Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="coupon-code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. A3KR5NWQ"
                className="font-mono tracking-widest text-base"
                maxLength={8}
                autoComplete="off"
              />
              <Button type="submit" disabled={looking || !inputCode.trim()}>
                {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look Up"}
              </Button>
            </div>
          </div>
          {lookupError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {lookupError}
            </div>
          ) : null}
        </form>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono tracking-widest">{coupon.code}</span>
                {coupon.status === "valid" ? (
                  <span className="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">Valid</span>
                ) : coupon.status === "redeemed" ? (
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">Redeemed</span>
                ) : (
                  <span className="text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">Expired</span>
                )}
              </div>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><span className="text-foreground font-medium">Reward:</span> {coupon.rewardText}</p>
                <p><span className="text-foreground font-medium">Customer:</span> {coupon.customerName}</p>
                <p><span className="text-foreground font-medium">Expires:</span> {new Date(coupon.expiresAt).toLocaleDateString()}</p>
                {coupon.redeemedAt ? (
                  <p><span className="text-foreground font-medium">Redeemed:</span> {new Date(coupon.redeemedAt).toLocaleDateString()}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {redeemSuccess ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Coupon redeemed successfully!
            </div>
          ) : null}

          {lookupError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {lookupError}
            </div>
          ) : null}

          <div className="flex gap-2">
            {coupon.status === "valid" && !redeemSuccess ? (
              <Button onClick={handleRedeem} disabled={redeeming} className="flex-1">
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Mark as Redeemed
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleReset} className={coupon.status === "valid" && !redeemSuccess ? "" : "flex-1"}>
              Look Up Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard (main export)
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "settings" ? "settings" : tabParam === "commercials" ? "commercials" : tabParam === "admin" ? "admin" : tabParam === "redeem" ? "redeem" : tabParam === "coupons" ? "coupons" : "interviews";
  const { data: org } = useOrg();
  const { data: orgs } = useOrgs();
  const queryClient = useQueryClient();

  function handleTabChange(value: string) {
    if (value === "settings" || value === "commercials" || value === "admin" || value === "redeem" || value === "coupons") {
      setSearchParams({ tab: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  function handleOrgSwitch(orgId: string) {
    setSelectedOrgId(orgId);
    queryClient.setQueryData(["selectedOrgId"], orgId);
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>
          </div>
          <DashboardHeader />
        </div>

        {/* Business switcher */}
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          {orgs && orgs.length > 1 ? (
            <Select value={org?.id ?? ""} onValueChange={handleOrgSwitch}>
              <SelectTrigger className="w-auto min-w-[200px] max-w-xs font-medium">
                <SelectValue placeholder="Select a business" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="font-medium text-foreground">
              {org?.name ?? <Skeleton className="h-5 w-40 inline-block" />}
            </span>
          )}
          {orgs && orgs.length > 1 ? (
            <span className="text-xs text-muted-foreground">{orgs.length} businesses</span>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="commercials" className="gap-1.5">
              <Clapperboard className="h-3.5 w-3.5" />
              Commercials
            </TabsTrigger>
            <TabsTrigger value="redeem" className="gap-1.5">
              <Gift className="h-3.5 w-3.5" />
              Redeem
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5">
              <TicketCheck className="h-3.5 w-3.5" />
              Coupons
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="admin" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interviews">
            <InterviewsTab />
          </TabsContent>

          <TabsContent value="commercials">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clapperboard className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-1">AI Commercial Builder</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                Upload your shots, generate AI-ready prompts for 30s and 60s ads.
              </p>
              <Link to="/commercial">
                <Button className="gap-2">
                  <Clapperboard className="h-4 w-4" />
                  Open Commercial Builder
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="redeem">
            <RedeemTab />
          </TabsContent>

          <TabsContent value="coupons">
            <CouponsTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="admin">
            <AdminTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
