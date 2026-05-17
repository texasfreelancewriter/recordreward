import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useOrg } from "@/hooks/useOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TemplateShot {
  id: string;
  title: string;
  instruction: string;
  suggestedDuration: number;
  required: boolean;
}

interface CommercialTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  shots: TemplateShot[];
}

interface CommercialProject {
  id: string;
}

export default function NewCommercialPage() {
  const navigate = useNavigate();
  const { data: org } = useOrg();
  const [selectedTemplate, setSelectedTemplate] = useState<CommercialTemplate | null>(null);
  const [step, setStep] = useState<"template" | "info">("template");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    location: "",
    tagline: "",
    website: "",
    instagramHandle: "",
    facebookPage: "",
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["commercial-templates"],
    queryFn: () => api.get<CommercialTemplate[]>("/api/commercials/templates"),
  });

  async function handleCreate() {
    if (!selectedTemplate) return;
    setSubmitting(true);
    try {
      const project = await api.post<CommercialProject>("/api/commercials/projects", {
        templateId: selectedTemplate.id,
        ...form,
        orgId: org?.id,
      });
      navigate(`/commercial/${project.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <Link to="/commercial" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
            ← Back to Commercials
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">New Commercial</h1>
          <p className="text-muted-foreground mt-1">
            {step === "template" ? "Choose a template to get started" : "Enter your business details"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex items-center gap-2 text-sm font-medium ${step === "template" ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === "template" ? "border-primary text-primary" : "border-muted-foreground bg-muted-foreground text-background"}`}>
              {step === "info" ? <Check className="h-3 w-3" /> : "1"}
            </span>
            Template
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 text-sm font-medium ${step === "info" ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === "info" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>2</span>
            Business Info
          </div>
        </div>

        {step === "template" ? (
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4">
                {(templates ?? []).map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {selectedTemplate?.id === template.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            {template.name}
                          </CardTitle>
                          <CardDescription className="mt-0.5">{template.category}</CardDescription>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {template.shots.length} shots
                        </span>
                      </div>
                    </CardHeader>
                    {template.description ? (
                      <CardContent className="pb-3">
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        {selectedTemplate?.id === template.id ? (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {template.shots.map((shot) => (
                              <span key={shot.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                {shot.title}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                disabled={!selectedTemplate}
                onClick={() => setStep("info")}
                className="gap-2"
              >
                Next: Business Info
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Details</CardTitle>
                <CardDescription>This info appears in the generated AI prompts and on-screen text.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    placeholder="e.g. Casa Hernandez"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. San Antonio, TX"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={form.tagline}
                    onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                    placeholder="e.g. Authentic flavors, unforgettable nights"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Online Presence</CardTitle>
                <CardDescription>Optional — included in the call-to-action.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="casahernandez.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="instagram">Instagram Handle</Label>
                  <Input
                    id="instagram"
                    value={form.instagramHandle}
                    onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
                    placeholder="casahernandez_sa"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="facebook">Facebook Page</Label>
                  <Input
                    id="facebook"
                    value={form.facebookPage}
                    onChange={(e) => setForm((f) => ({ ...f, facebookPage: e.target.value }))}
                    placeholder="facebook.com/casahernandez"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("template")} className="flex-1">
                Back
              </Button>
              <Button
                disabled={!form.businessName || submitting}
                onClick={handleCreate}
                className="flex-1 gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Creating…" : "Create Project"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
