import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Film, Plus, Clock, CheckCircle, Loader2, Video, Clapperboard } from "lucide-react";
import { api } from "@/lib/api";
import { useOrg } from "@/hooks/useOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CommercialProject {
  id: string;
  businessName: string;
  location: string;
  tagline: string;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  uploading: { label: "Uploading", variant: "secondary", icon: Loader2 },
  ready_for_generation: { label: "Ready", variant: "default", icon: CheckCircle },
  generating: { label: "Generating", variant: "secondary", icon: Loader2 },
  complete: { label: "Complete", variant: "default", icon: CheckCircle },
};

export default function CommercialProjectsPage() {
  const { data: org } = useOrg();
  const orgId = org?.id;

  const { data: projects, isLoading } = useQuery({
    queryKey: ["commercial-projects", orgId],
    queryFn: () => api.get<CommercialProject[]>(orgId ? `/api/commercials/projects?orgId=${orgId}` : "/api/commercials/projects"),
    enabled: !!orgId,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Clapperboard className="h-8 w-8 text-primary" />
              Commercial Builder
            </h1>
            <p className="text-muted-foreground mt-1">Create polished 30s and 60s ads for your business</p>
          </div>
          <Link to="/commercial/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Commercial
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Film className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No commercials yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose a template, upload your shots, and generate a ready-to-produce commercial.
              </p>
              <Link to="/commercial/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Commercial
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => {
              const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
              const StatusIcon = status.icon;
              return (
                <Link key={project.id} to={`/commercial/${project.id}`} className="block">
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1">{project.businessName}</CardTitle>
                        <Badge variant={status.variant} className="flex items-center gap-1 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {project.location ? (
                        <p className="text-sm text-muted-foreground mb-1">{project.location}</p>
                      ) : null}
                      {project.tagline ? (
                        <p className="text-sm text-muted-foreground/70 italic">"{project.tagline}"</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground/50 mt-3">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* How it works */}
        {(!projects || projects.length === 0) ? null : (
          <div className="mt-10 p-5 bg-muted/30 rounded-xl border border-border">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              How it works
            </h2>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Pick a template (Mexican Restaurant, Cat Clinic, Auto Repair, etc.)</li>
              <li>Enter your business name, location, and tagline</li>
              <li>Upload one photo/video per required shot</li>
              <li>Hit Generate — get AI-ready prompts for 30s vertical and 60s cinematic formats</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
