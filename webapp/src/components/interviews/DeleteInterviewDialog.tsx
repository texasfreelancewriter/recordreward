import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteInterviewDialogProps {
  interviewId: string;
  interviewTitle: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function DeleteInterviewDialog({
  interviewId,
  interviewTitle,
  trigger,
  onSuccess,
}: DeleteInterviewDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/interviews/${interviewId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.removeQueries({ queryKey: ["interview", interviewId] });
      toast({
        title: "Interview deleted",
        description: `"${interviewTitle}" has been deleted successfully.`,
      });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/interviews");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Interview</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{interviewTitle}"? This action cannot be undone and will permanently remove the interview along with all recorded clips.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
