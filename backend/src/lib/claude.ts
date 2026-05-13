import Anthropic from "@anthropic-ai/sdk";

export interface StarPlayer {
  name: string;
  role: string; // "player" | "coach"
  position?: string;
  stats?: string;
  reason: string;
}

export interface GeneratedQuestion {
  personName: string;
  role: string;
  questions: string[];
}

export interface PlayerProfile {
  name: string;
  jerseyNumber?: string | null;
  position?: string | null;
  team: string;
  age?: number | null;
  hometown?: string | null;
  yearsWithTeam?: number | null;
  yearsInLeague?: number | null;
  bio?: string | null;
  stats: Record<string, string>;
  references: string[];
}

function buildRosterContext(players: PlayerProfile[]): string {
  if (players.length === 0) return "";
  const lines = players.map((p) => {
    const parts = [`#${p.jerseyNumber ?? "?"} ${p.name}`, p.position ?? ""].filter(Boolean);
    if (p.age) parts.push(`age ${p.age}`);
    if (p.hometown) parts.push(`from ${p.hometown}`);
    if (p.yearsWithTeam) parts.push(`${p.yearsWithTeam} season(s) with ${p.team}`);
    if (p.yearsInLeague) parts.push(`${p.yearsInLeague} season(s) in league`);
    const statsStr = Object.entries(p.stats).map(([k, v]) => `${k}: ${v}`).join(", ");
    if (statsStr) parts.push(`Stats: ${statsStr}`);
    return `- ${parts.join(", ")}`;
  });
  return `\nPLAYER ROSTER (use these EXACT spellings — match transcript names to this list):\n${lines.join("\n")}\n`;
}

function buildProfileContext(players: PlayerProfile[]): string {
  if (players.length === 0) return "";
  const sections = players.map((p) => {
    const statsStr = Object.entries(p.stats).map(([k, v]) => `${k}: ${v}`).join(", ");
    const refs = p.references.length ? `References (use these instead of repeating the full name): ${p.references.map((r) => `"${r}"`).join(", ")}` : "";
    const bio = p.bio ? `Bio: ${p.bio}` : "";
    const details = [
      p.age ? `Age: ${p.age}` : "",
      p.hometown ? `Hometown: ${p.hometown}` : "",
      p.yearsWithTeam ? `${p.yearsWithTeam} season(s) with ${p.team}` : "",
      p.yearsInLeague ? `${p.yearsInLeague} total season(s) in league` : "",
      statsStr ? `Stats: ${statsStr}` : "",
    ].filter(Boolean).join(" | ");
    return [`${p.name} (#${p.jerseyNumber ?? "?"}, ${p.position ?? "?"}, ${p.team})`, details, bio, refs].filter(Boolean).join("\n  ");
  });
  return `\nPLAYER PROFILES (use bio details and reference aliases to write richer, varied copy):\n${sections.join("\n\n")}\n`;
}

export async function identifyStarsAndGenerateQuestions(
  transcript: string,
  sport: string,
  gameContext: string,
  apiKey: string,
  players: PlayerProfile[] = [],
  gameData = "",
  extraContext = ""
): Promise<{ stars: StarPlayer[]; questions: GeneratedQuestion[] }> {
  const client = new Anthropic({ apiKey });
  const rosterContext = buildRosterContext(players);

  const dataSection = [
    gameData ? `GAME DATA (cross-check transcript against this):\n${gameData}` : "",
    extraContext ? `ADDITIONAL CONTEXT (box score, notes, stats):\n${extraContext}` : "",
  ].filter(Boolean).join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are a sports information director analyzing a ${sport} game.
Based on the broadcast transcript${dataSection ? " and any supplemental game data provided" : ""}, identify the 2-4 standout players AND the head coach who should be interviewed.
Then generate 3 specific, open-ended interview questions for each person based on their actual performance.
Cross-check stats and names across all sources provided — if the transcript and box score conflict, trust the box score.
Questions should draw out great quotes — not yes/no questions.
${rosterContext ? "Use exact player name spellings from the provided roster." : ""}
Respond with valid JSON only, no markdown.`,
    messages: [
      {
        role: "user",
        content: `Game: ${gameContext}
Sport: ${sport}
${rosterContext}
${dataSection}
TRANSCRIPT:
${transcript.slice(0, 6000)}

Respond with this exact JSON structure:
{
  "stars": [
    {"name": "Full Name", "role": "player", "position": "PG", "stats": "24 pts, 8 ast", "reason": "Led 4th quarter comeback"},
    {"name": "Coach Name", "role": "coach", "reason": "Adjusted defensive scheme at halftime"}
  ],
  "questions": [
    {"personName": "Full Name", "role": "player", "questions": ["Q1", "Q2", "Q3"]},
    {"personName": "Coach Name", "role": "coach", "questions": ["Q1", "Q2", "Q3"]}
  ]
}`,
      },
    ],
  });

  const first = response.content[0];
  const text = first?.type === "text" ? first.text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned invalid JSON");

  return JSON.parse(jsonMatch[0]);
}

export async function generateRecapStory(
  transcript: string,
  quotes: Array<{ personName: string; role: string; question: string; answer: string }>,
  gameInfo: { homeTeam: string; awayTeam: string; sport: string; gameDate: string },
  apiKey: string,
  players: PlayerProfile[] = [],
  gameData = "",
  extraContext = ""
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const profileContext = buildProfileContext(players);

  const quotesText = quotes
    .map((q) => `${q.personName} (${q.role}) on "${q.question}":\n"${q.answer}"`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are a sports writer crafting a game recap in AP style.
Lead with the most newsworthy angle. Incorporate player and coach quotes naturally.
Write 350-500 words. Publication-ready copy.
${profileContext ? "Use the provided player profiles and reference aliases to vary how you refer to players — never repeat a full name twice in a row when a descriptive reference is available." : ""}`,
    messages: [
      {
        role: "user",
        content: `Write a game recap for ${gameInfo.awayTeam} at ${gameInfo.homeTeam} (${gameInfo.sport}) on ${gameInfo.gameDate}.
${profileContext}
${gameData ? `VERIFIED GAME DATA (use for accurate stats and scoring):\n${gameData}\n` : ""}
${extraContext ? `ADDITIONAL CONTEXT:\n${extraContext}\n` : ""}
BROADCAST TRANSCRIPT (summary):
${transcript.slice(0, 3000)}

POST-GAME QUOTES:
${quotesText}

Write the full recap story:`,
      },
    ],
  });

  const first = response.content[0];
  return first?.type === "text" ? first.text : "";
}
