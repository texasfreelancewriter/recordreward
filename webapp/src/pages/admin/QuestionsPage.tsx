import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  InterviewQuestionTemplate,
  InterviewQuestionCategory,
} from "../../../../backend/src/types";

const CATEGORIES: InterviewQuestionCategory[] = ["post_event", "preview", "general"];

const categoryLabels: Record<InterviewQuestionCategory, string> = {
  post_event: "Post Event",
  preview: "Preview",
  general: "General",
};

interface QuestionFormData {
  questionText: string;
  category: InterviewQuestionCategory;
  sortOrder: number;
}

const QuestionsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestionTemplate | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>({
    questionText: "",
    category: "general",
    sortOrder: 0,
  });

  // Fetch all question templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["questionTemplates"],
    queryFn: () => api.get<InterviewQuestionTemplate[]>("/api/interviews/templates"),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: QuestionFormData) =>
      api.post<InterviewQuestionTemplate>("/api/interviews/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionTemplates"] });
      toast.success("Question created successfully");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create question");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuestionFormData> }) =>
      api.patch<InterviewQuestionTemplate>(`/api/interviews/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionTemplates"] });
      toast.success("Question updated successfully");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update question");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/interviews/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionTemplates"] });
      toast.success("Question deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete question");
    },
  });

  const openCreateDialog = () => {
    setEditingQuestion(null);
    setFormData({
      questionText: "",
      category: "general",
      sortOrder: templates.length,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: InterviewQuestionTemplate) => {
    setEditingQuestion(template);
    setFormData({
      questionText: template.questionText,
      category: template.category,
      sortOrder: template.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingQuestion(null);
    setFormData({ questionText: "", category: "general", sortOrder: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (template: InterviewQuestionTemplate) => {
    if (window.confirm(`Are you sure you want to delete this question?\n\n"${template.questionText}"`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Sort templates by category then sortOrder
  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.category !== b.category) {
      return CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
    }
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Question Templates</h1>
                <p className="text-sm text-muted-foreground">
                  Manage interview question templates
                </p>
              </div>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No question templates yet</p>
            <Button onClick={openCreateDialog} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first question
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-24">Order</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTemplates.map((template, index) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {template.questionText}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
                        {categoryLabels[template.category]}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {template.sortOrder}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          template.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(template)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="questionText">Question Text</Label>
                <Input
                  id="questionText"
                  value={formData.questionText}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, questionText: e.target.value }))
                  }
                  placeholder="Enter the interview question..."
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: InterviewQuestionCategory) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first within each category
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingQuestion ? (
                  "Save Changes"
                ) : (
                  "Add Question"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionsPage;
