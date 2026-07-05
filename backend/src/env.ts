export interface Env {
  DB: D1Database;
  VIDEOS: R2Bucket;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  ANTHROPIC_API_KEY: string;
  COOKIE_DOMAIN?: string;
  CLOUDFLARE_STREAM_TOKEN: string;
  APP_BASE_URL?: string;
}

// Better Auth returns Date objects for timestamps; routes only need id/name/email
export interface AppVariables {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null;
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date | string;
  } | null;
}
