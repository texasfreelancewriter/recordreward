// Raw D1 row types — booleans are stored as 0/1 integers in SQLite

export type DbUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: number;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DbInterview = {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string;
  status: string;
  spreadClips: number;
  starRating: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DbInterviewQuestion = {
  id: string;
  interviewId: string;
  questionText: string;
  category: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DbInterviewClip = {
  id: string;
  interviewId: string;
  questionId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  scheduledPublishAt: string | null;
  publishedAt: string | null;
  isPublished: number;
  createdAt: string;
};

export type DbInterviewQuestionTemplate = {
  id: string;
  questionText: string;
  category: string;
  sortOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export type DbOrganization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type DbOrgMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
};

export type DbOrgKioskConfig = {
  id: string;
  organizationId: string;
  data: string;
  updatedAt: string;
};

// Normalised shapes returned by the API (booleans converted, relations assembled)

export type ApiClip = {
  id: string;
  interviewId: string;
  questionId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  scheduledPublishAt: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  createdAt: string;
};

export type ApiQuestion = {
  id: string;
  interviewId: string;
  questionText: string;
  category: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  clip: ApiClip | null;
};

export type ApiInterviewWithDetails = {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string;
  status: string;
  spreadClips: boolean;
  starRating: number | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  questions: ApiQuestion[];
  clips: ApiClip[];
};

// Converters

export function toApiClip(row: DbInterviewClip): ApiClip {
  return { ...row, isPublished: row.isPublished === 1 };
}

export function toApiQuestion(
  row: DbInterviewQuestion,
  clips: DbInterviewClip[]
): ApiQuestion {
  const clip = clips.find((c) => c.questionId === row.id);
  return { ...row, clip: clip ? toApiClip(clip) : null };
}

// Fetch a single interview with all relations assembled.
export async function fetchInterviewWithDetails(
  db: D1Database,
  interviewId: string
): Promise<ApiInterviewWithDetails | null> {
  const row = await db
    .prepare(
      `SELECT i.*, u.id AS u_id, u.name AS u_name, u.email AS u_email
       FROM Interview i
       LEFT JOIN user u ON i.userId = u.id
       WHERE i.id = ?`
    )
    .bind(interviewId)
    .first<DbInterview & { u_id: string; u_name: string; u_email: string }>();

  if (!row) return null;

  const batchOne = await db.batch([
    db
      .prepare(
        "SELECT * FROM InterviewQuestion WHERE interviewId = ? ORDER BY sortOrder ASC"
      )
      .bind(interviewId),
    db
      .prepare("SELECT * FROM InterviewClip WHERE interviewId = ?")
      .bind(interviewId),
  ]);

  const questions = ((batchOne[0]?.results ?? []) as DbInterviewQuestion[]);
  const clips = ((batchOne[1]?.results ?? []) as DbInterviewClip[]);

  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    title: row.title,
    status: row.status,
    spreadClips: row.spreadClips === 1,
    starRating: row.starRating,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: { id: row.u_id, name: row.u_name, email: row.u_email },
    questions: questions.map((q) => toApiQuestion(q, clips)),
    clips: clips.map(toApiClip),
  };
}

// Fetch multiple interviews with all relations, efficiently using IN queries.
export async function fetchInterviewsWithDetails(
  db: D1Database,
  where: string,
  binds: (string | number | null)[]
): Promise<ApiInterviewWithDetails[]> {
  const { results: interviewRows } = await db
    .prepare(
      `SELECT i.*, u.id AS u_id, u.name AS u_name, u.email AS u_email
       FROM Interview i
       LEFT JOIN user u ON i.userId = u.id
       ${where}
       ORDER BY i.createdAt DESC`
    )
    .bind(...binds)
    .all<DbInterview & { u_id: string; u_name: string; u_email: string }>();

  if (!interviewRows || interviewRows.length === 0) return [];

  const ids = interviewRows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  const batchTwo = await db.batch([
    db
      .prepare(
        `SELECT * FROM InterviewQuestion WHERE interviewId IN (${placeholders}) ORDER BY sortOrder ASC`
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM InterviewClip WHERE interviewId IN (${placeholders})`
      )
      .bind(...ids),
  ]);

  const allQuestions = ((batchTwo[0]?.results ?? []) as DbInterviewQuestion[]);
  const allClips = ((batchTwo[1]?.results ?? []) as DbInterviewClip[]);

  return interviewRows.map((row) => {
    const questions = allQuestions.filter((q) => q.interviewId === row.id);
    const clips = allClips.filter((c) => c.interviewId === row.id);
    return {
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId,
      title: row.title,
      status: row.status,
      spreadClips: row.spreadClips === 1,
      starRating: row.starRating,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: { id: row.u_id, name: row.u_name, email: row.u_email },
      questions: questions.map((q) => toApiQuestion(q, clips)),
      clips: clips.map(toApiClip),
    };
  });
}
