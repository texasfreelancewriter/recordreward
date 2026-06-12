export type ButtonConfig = {
  id: "first_time" | "return";
  label: string;
  questionText?: string; // legacy — use questions[] instead
  questions: string[];
  variant: "primary" | "secondary";
  enabled?: boolean;
};

export type SocialMediaConfig = {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
};

export type TemplateConfig = {
  backgroundImage: string;
  logoImage: string;
  rewardText: string;
  rewardEnabled: boolean;
  heroText: string;
  emailEnabled: boolean;
  starRatingEnabled: boolean;
  buttons: ButtonConfig[];
  socialMedia?: SocialMediaConfig;
};

export const DEFAULT_CONFIG: TemplateConfig = {
  backgroundImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1080&q=80",
  logoImage: "",
  rewardText: "a reward",
  rewardEnabled: true,
  heroText: "Tell Us About Your Visit",
  emailEnabled: true,
  starRatingEnabled: true,
  buttons: [
    {
      id: "first_time",
      label: "First Time",
      questions: [],
      variant: "primary",
      enabled: true,
    },
    {
      id: "return",
      label: "Return Visit",
      questions: [],
      variant: "secondary",
      enabled: true,
    },
  ],
};

const STORAGE_KEY = "kiosk_template_config";

export function getConfig(): TemplateConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<TemplateConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        rewardEnabled: parsed.rewardEnabled ?? true,
        heroText: parsed.heroText ?? DEFAULT_CONFIG.heroText,
        emailEnabled: parsed.emailEnabled ?? true,
        starRatingEnabled: parsed.starRatingEnabled ?? true,
        buttons: (parsed.buttons && parsed.buttons.length > 0)
        ? parsed.buttons.map((b) => ({
            ...b,
            questions: b.questions ?? (b.questionText ? [b.questionText] : []),
          }))
        : DEFAULT_CONFIG.buttons,
      };
    }
  } catch (_e) {
    // ignore parse errors, fall through to default
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: TemplateConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://record-reward-backend.texasfreelancewriter.workers.dev";

export async function fetchServerConfig(orgId?: string): Promise<TemplateConfig | null> {
  try {
    const url = orgId ? `${API_BASE}/api/kiosk-config?orgId=${orgId}` : `${API_BASE}/api/kiosk-config`;
    const res = await fetch(url, { credentials: "include" });
    const json = await res.json();
    if (json.data) {
      const buttons = (json.data.buttons ?? DEFAULT_CONFIG.buttons).map((b: ButtonConfig) => ({
        ...b,
        questions: b.questions ?? (b.questionText ? [b.questionText] : []),
      }));
      return { ...DEFAULT_CONFIG, ...json.data, rewardEnabled: json.data.rewardEnabled ?? true, heroText: json.data.heroText ?? DEFAULT_CONFIG.heroText, emailEnabled: json.data.emailEnabled ?? true, starRatingEnabled: json.data.starRatingEnabled ?? true, buttons };
    }
    return null;
  } catch { return null; }
}

export async function saveServerConfig(config: TemplateConfig, orgId?: string): Promise<void> {
  const url = orgId ? `${API_BASE}/api/kiosk-config?orgId=${orgId}` : `${API_BASE}/api/kiosk-config`;
  await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    credentials: "include",
  });
}
