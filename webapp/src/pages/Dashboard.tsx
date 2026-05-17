import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Video, CheckCircle, Clock, User, Calendar, Trash2, Copy, Check, LogOut, Building2, PlusCircle, Upload, Loader2, Clapperboard } from "lucide-react";
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
import { DeleteInterviewDialog } from "@/components/interviews/DeleteInterviewDialog";
import { signOut } from "@/lib/auth-client";
import { useOrg, useOrgs, setSelectedOrgId } from "@/hooks/useOrg";
import {
  fetchServerConfig,
  saveServerConfig,
  getConfig,
  TemplateConfig,
  SocialMediaConfig,
} from "@/lib/template-config";

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
          <CardTitle className="text-base">Kiosk Buttons</CardTitle>
          <CardDescription>Control which buttons appear and what they say.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {(["first_time", "ace"] as const).map((btnId) => {
            const btn = draft.buttons.find((b) => b.id === btnId) ?? draft.buttons[0];
            const btnLabel = btnId === "first_time" ? "First Time Button" : "Ace Button";
            return (
              <div key={btnId} className="flex flex-col gap-3">
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
                <div className="flex flex-col gap-1.5">
                  <Label>Prompt</Label>
                  <textarea
                    value={btn.questionText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        buttons: prev.buttons.map((b) =>
                          b.id === btnId ? { ...b, questionText: e.target.value } : b
                        ),
                      }))
                    }
                    rows={3}
                    placeholder="Question shown to the customer while recording"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                  />
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
// Dashboard (main export)
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "settings" ? "settings" : searchParams.get("tab") === "commercials" ? "commercials" : "interviews";
  const { data: org } = useOrg();
  const { data: orgs } = useOrgs();
  const queryClient = useQueryClient();

  function handleTabChange(value: string) {
    setSearchParams(value === "settings" ? { tab: "settings" } : {}, { replace: true });
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your interviews and kiosk settings</p>
        </div>

        {/* Business switcher — always visible above tabs when multiple orgs */}
        {orgs && orgs.length > 1 ? (
          <div className="flex flex-wrap gap-2 mb-6">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => handleOrgSwitch(o.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  org?.id === o.id
                    ? "bg-primary/10 border-primary/50 text-primary"
                    : "bg-muted/40 border-border hover:bg-muted text-foreground"
                }`}
              >
                <Building2 className="h-4 w-4" />
                {o.name}
              </button>
            ))}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="commercials" className="gap-1.5">
              <Clapperboard className="h-3.5 w-3.5" />
              Commercials
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
