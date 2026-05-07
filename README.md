# Interview Recording System

A video interview recording system that allows you to create, record, and manage video interviews.

## Features

- **Interview Creation** - Create new interviews with customizable questions
- **Video Recording** - Record video responses directly in the browser
- **WebM to MP4 Conversion** - Automatic video conversion for compatibility
- **Thumbnail Generation** - Auto-generated thumbnails for each clip
- **View & Download** - Watch clips individually or as a full interview, download MP4 files

## Tech Stack

### Frontend (webapp/)
- React + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- React Router
- TanStack Query

### Backend (backend/)
- Bun runtime
- Hono web framework
- Prisma ORM (SQLite)
- Better Auth (Email OTP)
- FFmpeg for video processing

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page |
| `/interviews` | List all interviews |
| `/interviews/:id` | View interview details and clips |
| `/interviews/:id/record` | Record video responses |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interviews` | List all interviews |
| GET | `/api/interviews/:id` | Get single interview with details |
| POST | `/api/interviews` | Create new interview |
| PATCH | `/api/interviews/:id` | Update interview |
| DELETE | `/api/interviews/:id` | Delete interview |
| GET | `/api/interviews/templates` | Get question templates |
| POST | `/api/interviews/templates` | Create question template |
| POST | `/api/interviews/:id/clips` | Save video clip |
| POST | `/api/upload/video` | Upload video (converts WebM to MP4) |
| GET | `/api/download` | Download file proxy |

## Database Models

- **User** - Users who can be interviewed
- **Interview** - Main interview session
- **InterviewQuestion** - Questions for an interview
- **InterviewClip** - Video clips for each question
- **InterviewQuestionTemplate** - Reusable question templates

## Getting Started

1. The frontend runs on port 8000
2. The backend runs on port 3000
3. Navigate to `/interviews` to start using the system
4. Create a user account via auth, then create an interview
