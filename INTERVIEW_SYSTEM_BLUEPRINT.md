# Interview System Blueprint

Complete documentation for recreating the video interview recording system in another application.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend API Routes](#backend-api-routes)
4. [Video Processing](#video-processing)
5. [Frontend Components](#frontend-components)
6. [Question Flow Logic](#question-flow-logic)
7. [Recording Flow](#recording-flow)
8. [Authentication](#authentication)
9. [Type Definitions](#type-definitions)
10. [Environment Setup](#environment-setup)

---

## Overview

This interview system allows:
- **Admins** to create question templates organized by category
- **Users** to be assigned interviews with auto-populated questions
- **Recording** video responses one question at a time
- **Automatic conversion** from WebM to MP4 with thumbnail generation
- **Background uploads** so users don't wait during recording
- **Playback** of all recorded clips with "Play All" feature

### Key Features
- Text-to-speech compatible (questions read aloud)
- "Please read the question aloud before you answer" instruction
- Progress tracking (Question X of Y)
- Status workflow: pending → recorded → published
- Background video uploads (non-blocking UI)

---

## Database Schema

### Prisma Schema (SQLite)

```prisma
// User model (Better Auth compatible)
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions   Session[]
  accounts   Account[]
  interviews Interview[]
}

// Better Auth required models
model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// Question templates (admin-managed library)
model InterviewQuestionTemplate {
  id           String   @id @default(cuid())
  questionText String
  category     String   @default("general") // "post_event" | "preview" | "general"
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Interview session
model Interview {
  id          String   @id @default(cuid())
  userId      String
  title       String   @default("Interview")
  status      String   @default("pending") // "pending" | "recorded" | "published"
  spreadClips Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  questions InterviewQuestion[]
  clips     InterviewClip[]
}

// Questions assigned to a specific interview
model InterviewQuestion {
  id           String   @id @default(cuid())
  interviewId  String
  questionText String
  category     String
  sortOrder    Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  interview Interview      @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  clip      InterviewClip?
}

// Video response clips (one per question)
model InterviewClip {
  id                 String    @id @default(cuid())
  interviewId        String
  questionId         String    @unique
  videoUrl           String
  thumbnailUrl       String?
  duration           Int?      // seconds
  scheduledPublishAt DateTime?
  publishedAt        DateTime?
  isPublished        Boolean   @default(false)
  createdAt          DateTime  @default(now())

  interview Interview         @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  question  InterviewQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
}
```

---

## Backend API Routes

### Question Templates (Admin)

```typescript
// List all templates
GET /api/interviews/templates
Response: { data: InterviewQuestionTemplate[] }

// Create template
POST /api/interviews/templates
Body: { questionText: string, category?: string, sortOrder?: number, isActive?: boolean }
Response: { data: InterviewQuestionTemplate }

// Update template
PATCH /api/interviews/templates/:id
Body: { questionText?, category?, sortOrder?, isActive? }
Response: { data: InterviewQuestionTemplate }

// Delete template
DELETE /api/interviews/templates/:id
Response: { data: { success: true } }
```

### Interviews

```typescript
// List all interviews with details
GET /api/interviews
Response: { data: Interview[] } // includes user, questions, clips

// Get single interview
GET /api/interviews/:id
Response: { data: Interview }

// Create interview (auto-populates questions from active templates)
POST /api/interviews
Body: { userId: string, title?: string, customQuestions?: string[] }
Response: { data: Interview }

// Update interview
PATCH /api/interviews/:id
Body: { status?, title?, spreadClips? }
Response: { data: Interview }

// Delete interview (cascades to questions and clips)
DELETE /api/interviews/:id
Response: { data: { success: true } }
```

### Interview Questions

```typescript
// Update question text
PATCH /api/interviews/:interviewId/questions/:questionId
Body: { questionText: string }
Response: { data: InterviewQuestion }

// Delete question
DELETE /api/interviews/:interviewId/questions/:questionId
Response: { data: { success: true } }

// Add new question
POST /api/interviews/:interviewId/questions
Body: { questionText: string, category?: string }
Response: { data: InterviewQuestion }
```

### Clips (Video Responses)

```typescript
// Save clip
POST /api/interviews/:interviewId/clips
Body: { questionId: string, videoUrl: string, thumbnailUrl?: string, duration?: number }
Response: { data: InterviewClip }

// Delete clip
DELETE /api/interviews/:interviewId/clips/:clipId
Response: { data: { success: true } }
```

### Users

```typescript
// List users for interview creation
GET /api/interviews/users/list
Response: { data: User[] }
```

---

## Video Processing

### WebM to MP4 Conversion

The system converts browser-recorded WebM to web-friendly MP4:

```typescript
// FFmpeg conversion settings
const ffmpegArgs = [
  '-i', inputPath,
  '-c:v', 'libx264',        // H.264 video codec
  '-preset', 'fast',
  '-profile:v', 'baseline',
  '-level', '3.0',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',            // AAC audio codec
  '-b:a', '128k',
  '-ar', '44100',
  '-ac', '2',
  '-movflags', '+faststart', // Web-optimized
  outputPath
];

// Thumbnail extraction (first frame)
const thumbnailArgs = [
  '-i', inputPath,
  '-ss', '00:00:00',
  '-vframes', '1',
  '-vf', 'scale=640:-1',
  '-q:v', '2',
  thumbnailPath
];
```

### Video Upload Endpoint

```typescript
POST /api/upload/video
Content-Type: multipart/form-data
Body: { file: Blob }

Response: {
  data: {
    id: string,
    url: string,           // Final video URL
    thumbnailUrl: string,  // Generated thumbnail
    duration: number,      // Seconds
    filename: string,
    contentType: string,
    sizeBytes: number
  }
}
```

---

## Frontend Components

### 1. Interviews List Page

```
/interviews
```

Features:
- Lists all interviews sorted by status (Pending first, then Completed)
- Card view showing: title, user name, date, status badge
- "New Interview" button opens creation modal
- Delete button with confirmation dialog
- Click card to view/record

### 2. Record Interview Page

```
/interviews/:id/record
```

Features:
- Single question displayed at a time
- Camera preview with recording controls
- Progress bar: "Question X of Y"
- Instruction: "Please read the question aloud before you answer"
- Question text displayed prominently
- Record/Stop/Next buttons
- Background upload counter: "(Z uploading...)"
- Auto-advances to next question
- Waits for all uploads before completion

**Recording Flow:**
```
1. Display question text
2. User clicks "Start Recording"
3. MediaRecorder captures WebM
4. User clicks "Stop"
5. Video uploaded in background
6. If more questions: Next button → go to step 1
7. If last question: Wait for uploads → mark complete → navigate to view
```

### 3. View Interview Page

```
/interviews/:id
```

Features:
- Video player for selected clip
- "Play All" button sequences through all clips
- Clip list with thumbnails, duration, download button
- Shows remaining unrecorded questions
- Responsive grid layout

### 4. Questions Admin Page

```
/admin/questions
```

Features:
- CRUD for question templates
- Filter by category (Post Event, Preview, General)
- Toggle active/inactive
- Reorder by sortOrder
- Table with inline editing

### 5. New Interview Modal

Features:
- Select user from dropdown
- Enter interview title
- Creates interview with all active template questions

---

## Question Flow Logic

### Template System

1. Admins create question templates with:
   - `questionText` - The actual question
   - `category` - Grouping (post_event, preview, general)
   - `sortOrder` - Display order
   - `isActive` - Whether to include in new interviews

2. When creating an interview:
   - Fetches all active templates
   - Creates InterviewQuestion for each
   - Orders by sortOrder

### Interview Creation

```typescript
// Backend logic
async function createInterview(userId: string, title?: string, customQuestions?: string[]) {
  // Create interview
  const interview = await prisma.interview.create({
    data: { userId, title: title || "Untitled Interview" }
  });

  // Get questions (custom or from templates)
  let questions: { questionText: string; category: string; sortOrder: number }[];

  if (customQuestions?.length) {
    questions = customQuestions.map((text, i) => ({
      questionText: text,
      category: "general",
      sortOrder: i
    }));
  } else {
    const templates = await prisma.interviewQuestionTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });
    questions = templates.map((t, i) => ({
      questionText: t.questionText,
      category: t.category,
      sortOrder: t.sortOrder
    }));
  }

  // Create questions
  await prisma.interviewQuestion.createMany({
    data: questions.map(q => ({ ...q, interviewId: interview.id }))
  });

  return interview;
}
```

---

## Recording Flow

### Browser Recording Setup

```typescript
// Get camera/mic access
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720 },
  audio: true
});

// Create recorder (WebM format)
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9,opus'
});

const chunks: Blob[] = [];
mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'video/webm' });
  // Upload in background
  uploadVideo(blob);
};
```

### Background Upload Queue

```typescript
const [uploadingCount, setUploadingCount] = useState(0);

async function handleRecordingComplete(blob: Blob, questionId: string) {
  setUploadingCount(c => c + 1);

  try {
    // Upload video (converts to MP4 on server)
    const { url, thumbnailUrl, duration } = await uploadVideo(blob);

    // Save clip to database
    await api.post(`/api/interviews/${interviewId}/clips`, {
      questionId,
      videoUrl: url,
      thumbnailUrl,
      duration
    });
  } finally {
    setUploadingCount(c => c - 1);
  }
}
```

### Completion Logic

```typescript
async function handleFinish() {
  // Wait for all uploads to complete
  while (uploadingCount > 0) {
    await new Promise(r => setTimeout(r, 500));
  }

  // Update interview status
  await api.patch(`/api/interviews/${interviewId}`, {
    status: 'recorded'
  });

  // Navigate to view page
  navigate(`/interviews/${interviewId}`);
}
```

---

## Authentication

### Better Auth Setup

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),

  emailAndPassword: { enabled: false },

  emailOtp: {
    async sendVerificationOtp({ email, otp }) {
      // Send OTP via email service
      await sendEmail(email, `Your code: ${otp}`);
    }
  },

  trustedOrigins: [
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.yourdomain.com"
  ]
});
```

### Auth Routes

```typescript
// Mount Better Auth
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));
```

---

## Type Definitions

### Frontend Types

```typescript
// User
interface User {
  id: string;
  name: string;
  email: string;
}

// Question categories
type QuestionCategory = "post_event" | "preview" | "general";

// Interview status
type InterviewStatus = "pending" | "recorded" | "published";

// Question template
interface QuestionTemplate {
  id: string;
  questionText: string;
  category: QuestionCategory;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interview question (with optional clip)
interface Question {
  id: string;
  interviewId: string;
  questionText: string;
  category: QuestionCategory;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  clip?: Clip;
}

// Video clip
interface Clip {
  id: string;
  interviewId: string;
  questionId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  isPublished: boolean;
  createdAt: string;
}

// Full interview with relations
interface Interview {
  id: string;
  userId: string;
  title: string;
  status: InterviewStatus;
  spreadClips: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  questions?: Question[];
  clips?: Clip[];
}
```

### Zod Schemas (API Validation)

```typescript
import { z } from "zod";

export const QuestionCategorySchema = z.enum(["post_event", "preview", "general"]);
export const InterviewStatusSchema = z.enum(["pending", "recorded", "published"]);

export const CreateInterviewSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
  customQuestions: z.array(z.string()).optional()
});

export const CreateClipSchema = z.object({
  questionId: z.string(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional()
});

export const UpdateInterviewSchema = z.object({
  status: InterviewStatusSchema.optional(),
  title: z.string().optional(),
  spreadClips: z.boolean().optional()
});
```

---

## Environment Setup

### Required Dependencies

**Backend:**
```json
{
  "dependencies": {
    "hono": "^4.x",
    "@hono/zod-validator": "^0.x",
    "@prisma/client": "^6.x",
    "better-auth": "^1.x",
    "zod": "^3.x",
    "@ffmpeg-installer/ffmpeg": "^1.x",
    "fluent-ffmpeg": "^2.x"
  }
}
```

**Frontend:**
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x",
    "tailwindcss": "^3.x",
    "@radix-ui/react-*": "various",
    "lucide-react": "^0.x"
  }
}
```

### Environment Variables

```env
# Backend
DATABASE_URL="file:./dev.db"
BETTER_AUTH_SECRET="your-secret-key"
STORAGE_URL="your-storage-endpoint"

# Frontend
VITE_BACKEND_URL="http://localhost:3000"
```

### Folder Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── interviews.ts
│   │   ├── utils/
│   │   │   └── video.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── index.ts
│   │   └── types.ts
│   └── prisma/
│       └── schema.prisma
│
├── webapp/
│   └── src/
│       ├── pages/
│       │   ├── interviews/
│       │   │   ├── InterviewsPage.tsx
│       │   │   ├── RecordInterviewPage.tsx
│       │   │   └── ViewInterviewPage.tsx
│       │   └── admin/
│       │       └── QuestionsPage.tsx
│       ├── components/
│       │   └── interviews/
│       │       ├── NewInterviewModal.tsx
│       │       └── DeleteInterviewDialog.tsx
│       ├── lib/
│       │   ├── api.ts
│       │   └── upload.ts
│       └── types/
│           └── interviews.ts
```

---

## Quick Start Checklist

1. [ ] Set up Prisma schema with models above
2. [ ] Run `prisma migrate dev` to create database
3. [ ] Create backend routes for templates, interviews, questions, clips
4. [ ] Set up FFmpeg video conversion utility
5. [ ] Create video upload endpoint with WebM→MP4 conversion
6. [ ] Build Interviews list page with create/delete
7. [ ] Build Record page with MediaRecorder and background uploads
8. [ ] Build View page with video player and clip list
9. [ ] Build Admin questions page for template management
10. [ ] Set up authentication (Better Auth or alternative)
11. [ ] Test full flow: create → record → view

---

## Notes

- **Browser Compatibility:** MediaRecorder works in Chrome, Firefox, Edge. Safari has limited codec support.
- **Mobile:** Works on mobile browsers but camera orientation may need handling.
- **Storage:** Videos can be large; consider cloud storage (S3, GCS, etc.)
- **Performance:** Background uploads are critical for smooth UX during recording.
- **Accessibility:** Add proper ARIA labels and keyboard navigation.

---

*Generated from Vibecode Interview System*
