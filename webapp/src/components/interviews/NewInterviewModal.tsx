import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { User, CreateInterviewInput, Interview } from "@/types/interviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewInterviewModal({ open, onOpenChange, onSuccess }: NewInterviewModalProps) {
  const [title, setTitle] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["interview-users"],
    queryFn: () => api.get<User[]>("/api/interviews/users/list"),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateInterviewInput) =>
      api.post<Interview>("/api/interviews", input),
    onSuccess: () => {
      setTitle("");
      setSelectedUserId("");
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedUserId) return;
    createMutation.mutate({ title: title.trim(), userId: selectedUserId });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTitle("");
      setSelectedUserId("");
      createMutation.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Interview</DialogTitle>
          <DialogDescription>
            Create a new interview session for a user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Interview Title</Label>
              <Input
                id="title"
                placeholder="e.g., Product Manager Interview"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Select User</Label>
              {usersLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading users...</span>
                </div>
              ) : (
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {users?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users available</p>
              ) : null}
            </div>

            {createMutation.isError ? (
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create interview"}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !selectedUserId || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Interview"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
