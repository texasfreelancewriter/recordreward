import { z } from "zod";

// Interview enums
export const InterviewQuestionCategorySchema = z.enum(["post_event", "preview", "general"]);
export type InterviewQuestionCategory = z.infer<typeof InterviewQuestionCategorySchema>;

export const InterviewStatusSchema = z.enum(["pending", "recorded", "published", "pending_approval", "dismissed"]);
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

// Question Templates
export const InterviewQuestionTemplateSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  category: InterviewQuestionCategorySchema,
  sortOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InterviewQuestionTemplate = z.infer<typeof InterviewQuestionTemplateSchema>;

export const CreateInterviewQuestionTemplateSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  category: InterviewQuestionCategorySchema,
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});
export type CreateInterviewQuestionTemplate = z.infer<typeof CreateInterviewQuestionTemplateSchema>;

export const UpdateInterviewQuestionTemplateSchema = CreateInterviewQuestionTemplateSchema.partial();

// Interview Questions
export const InterviewQuestionSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  questionText: z.string(),
  category: z.string(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

// Interview Clips
export const InterviewClipSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  questionId: z.string(),
  videoUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  duration: z.number().nullable(),
  scheduledPublishAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  isPublished: z.boolean(),
  createdAt: z.string(),
});
export type InterviewClip = z.infer<typeof InterviewClipSchema>;

export const CreateInterviewClipSchema = z.object({
  questionId: z.string(),
  videoUrl: z.string().min(1, "Video URL is required"),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
});
export type CreateInterviewClip = z.infer<typeof CreateInterviewClipSchema>;

// Interview
export const InterviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  status: InterviewStatusSchema,
  spreadClips: z.boolean(),
  starRating: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Interview = z.infer<typeof InterviewSchema>;

export const CreateInterviewSchema = z.object({
  userId: z.string().min(1, "User is required"),
  title: z.string().optional(),
  spreadClips: z.boolean().optional(),
  customQuestions: z.array(z.object({
    questionText: z.string(),
    category: InterviewQuestionCategorySchema,
  })).optional(),
});
export type CreateInterview = z.infer<typeof CreateInterviewSchema>;

// Interview Question with optional clip
export const InterviewQuestionWithClipSchema = InterviewQuestionSchema.extend({
  clip: InterviewClipSchema.nullable(),
});
export type InterviewQuestionWithClip = z.infer<typeof InterviewQuestionWithClipSchema>;

// Interview with all relations (for API responses)
export const InterviewWithDetailsSchema = InterviewSchema.extend({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  questions: z.array(InterviewQuestionWithClipSchema),
  clips: z.array(InterviewClipSchema),
});
export type InterviewWithDetails = z.infer<typeof InterviewWithDetailsSchema>;

// User schema for responses
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

// Admin - Create user schema
export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;
