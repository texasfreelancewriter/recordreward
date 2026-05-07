import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Video, CheckCircle, User, Calendar, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Interview } from "@/types/interviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteInterviewDialog } from "@/components/interviews/DeleteInterviewDialog";

function InterviewCard({ interview, onDelete }: { interview: Interview; onDelete: () => void }) {
  const statusConfig = {
    pending: { label: "Pending", variant: "secondary" as const, icon: Video },
    recorded: { label: "Recorded", variant: "default" as const, icon: Video },
    published: { label: "Published", variant: "default" as const, icon: CheckCircle },
  };

  const status = statusConfig[interview.status] || statusConfig.pending;
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

export default function InterviewsPage() {
  const { data: interviews, isLoading, error, refetch } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => api.get<Interview[]>("/api/interviews"),
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive mb-4">Failed to load interviews</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground mt-1">Customer video responses</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <InterviewCardSkeleton />
            <InterviewCardSkeleton />
            <InterviewCardSkeleton />
          </div>
        ) : interviews && interviews.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {interviews.map((interview) => (
              <InterviewCard key={interview.id} interview={interview} onDelete={() => refetch()} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No interviews yet</p>
              <p className="text-sm text-muted-foreground mt-1">Interviews will appear here after customers use the kiosk</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
