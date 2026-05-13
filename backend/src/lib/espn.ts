export interface ESPNResult {
  found: boolean;
  source: string;
  summary: string;
}

// Maps our sport names to ESPN API sport/league paths (tries in order)
const LEAGUE_MAP: Record<string, { sport: string; league: string }[]> = {
  baseball:    [{ sport: "baseball",    league: "mlb" }],
  basketball:  [{ sport: "basketball",  league: "nba" },
                { sport: "basketball",  league: "mens-college-basketball" }],
  football:    [{ sport: "football",    league: "nfl" },
                { sport: "football",    league: "college-football" }],
  soccer:      [{ sport: "soccer",      league: "usa.1" }],   // MLS
  hockey:      [{ sport: "hockey",      league: "nhl" }],
};

function toESPNDate(iso: string): string {
  // "2025-10-29" → "20251029"
  return iso.replace(/-/g, "");
}

function teamMatches(espnName: string, searchName: string): boolean {
  const a = espnName.toLowerCase();
  const b = searchName.toLowerCase();
  if (a === b || a.includes(b) || b.includes(a)) return true;
  // Match on last word (e.g. "Dodgers" in "Los Angeles Dodgers")
  const lastWord = b.split(" ").pop() ?? "";
  return lastWord.length > 3 && a.includes(lastWord);
}

function formatLinescores(linescores: { value: number }[]): string {
  return linescores.map((l) => String(l.value ?? "-")).join("  ");
}

function formatLeaders(leaders: unknown[]): string {
  if (!Array.isArray(leaders) || leaders.length === 0) return "";
  const lines: string[] = [];
  for (const group of leaders as Record<string, unknown>[]) {
    const groupLeaders = group.leaders as Record<string, unknown>[] | undefined;
    if (!groupLeaders?.length) continue;
    const top = groupLeaders[0];
    const athlete = (top.athlete as Record<string, string> | undefined)?.displayName ?? "Unknown";
    const val = String(top.displayValue ?? "");
    const statName = String(group.displayName ?? group.name ?? "");
    lines.push(`  ${athlete}: ${val} (${statName})`);
  }
  return lines.join("\n");
}

async function fetchScoreboard(sport: string, league: string, date: string): Promise<unknown> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${date}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return res.json();
}

async function fetchSummary(sport: string, league: string, eventId: string): Promise<unknown> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${eventId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return res.json();
}

function buildSummary(
  eventName: string,
  scoreDisplay: string,
  status: string,
  competitors: Record<string, unknown>[],
  leagueName: string
): string {
  const lines: string[] = [
    `=== AUTO-FETCHED: ESPN (${leagueName}) ===`,
    `${eventName}`,
    `Score: ${scoreDisplay} — ${status}`,
    "",
  ];

  // Linescore table
  const hasLinescores = competitors.some(
    (c) => Array.isArray(c.linescores) && (c.linescores as unknown[]).length > 0
  );
  if (hasLinescores) {
    lines.push("LINESCORE:");
    for (const comp of competitors) {
      const team = (comp.team as Record<string, string>)?.shortDisplayName ??
                   (comp.team as Record<string, string>)?.displayName ?? "Team";
      const ls = formatLinescores((comp.linescores as { value: number }[]) ?? []);
      const score = String(comp.score ?? "");
      const stats = comp.statistics as { name: string; displayValue: string }[] | undefined;
      const hits   = stats?.find((s) => s.name === "hits")?.displayValue ?? "-";
      const errors = stats?.find((s) => s.name === "errors")?.displayValue ?? "-";
      lines.push(`  ${team.padEnd(16)} ${ls}  |  R:${score}  H:${hits}  E:${errors}`);
    }
    lines.push("");
  }

  // Stats leaders
  for (const comp of competitors) {
    const teamName = (comp.team as Record<string, string>)?.shortDisplayName ?? "Team";
    const leaders = comp.leaders as unknown[] | undefined;
    if (leaders?.length) {
      const leaderStr = formatLeaders(leaders);
      if (leaderStr) {
        lines.push(`${teamName} LEADERS:`);
        lines.push(leaderStr);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

export async function fetchESPNGameData(
  sport: string,
  homeTeam: string,
  awayTeam: string,
  gameDate: string // YYYY-MM-DD
): Promise<ESPNResult> {
  const leagues = LEAGUE_MAP[sport.toLowerCase()] ?? [];
  if (leagues.length === 0) {
    return { found: false, source: "", summary: "" };
  }

  const dateStr = toESPNDate(gameDate);
  // Also try the day before/after to handle timezone edge cases
  const dateObj = new Date(gameDate + "T12:00:00Z");
  const datePrev = toESPNDate(new Date(dateObj.getTime() - 86400000).toISOString().split("T")[0]);
  const dateNext = toESPNDate(new Date(dateObj.getTime() + 86400000).toISOString().split("T")[0]);

  for (const { sport: espnSport, league } of leagues) {
    for (const date of [dateStr, datePrev, dateNext]) {
      try {
        const data = await fetchScoreboard(espnSport, league, date) as Record<string, unknown> | null;
        if (!data) continue;

        const events = data.events as Record<string, unknown>[] | undefined;
        if (!events?.length) continue;

        // Find the matching game
        const match = events.find((event) => {
          const competitions = event.competitions as Record<string, unknown>[] | undefined;
          if (!competitions?.length) return false;
          const comp = competitions[0];
          const competitors = comp.competitors as Record<string, unknown>[] | undefined;
          if (!competitors?.length) return false;
          const teamNames = competitors.map((c) =>
            ((c.team as Record<string, string>)?.displayName ?? "")
          );
          return (
            teamNames.some((n) => teamMatches(n, homeTeam)) &&
            teamNames.some((n) => teamMatches(n, awayTeam))
          );
        });

        if (!match) continue;

        const eventId = String(match.id ?? "");
        const competition = (match.competitions as Record<string, unknown>[])[0];
        const competitors = (competition.competitors as Record<string, unknown>[]) ?? [];
        const statusObj = competition.status as Record<string, unknown> | undefined;
        const statusDesc = String((statusObj?.type as Record<string, unknown>)?.description ?? "Final");
        const eventName = String(match.name ?? `${awayTeam} at ${homeTeam}`);

        const scoreDisplay = competitors
          .map((c) => {
            const name = (c.team as Record<string, string>)?.shortDisplayName ?? "Team";
            return `${name} ${c.score}`;
          })
          .join(", ");

        // Try to get detailed summary with pitching/batting stats
        let summary = buildSummary(eventName, scoreDisplay, statusDesc, competitors, league.toUpperCase());

        if (eventId) {
          try {
            const detail = await fetchSummary(espnSport, league, eventId) as Record<string, unknown> | null;
            if (detail) {
              const boxscore = detail.boxscore as Record<string, unknown> | undefined;
              const players = boxscore?.players as Record<string, unknown>[] | undefined;
              if (players?.length) {
                summary += "\nDETAILED BOX SCORE:\n";
                for (const teamData of players) {
                  const teamName = ((teamData.team as Record<string, string>)?.displayName ?? "Team");
                  const stats = teamData.statistics as Record<string, unknown>[] | undefined;
                  if (!stats) continue;
                  for (const statGroup of stats) {
                    const groupName = String(statGroup.name ?? "");
                    const athletes = statGroup.athletes as Record<string, unknown>[] | undefined;
                    if (!athletes?.length) continue;
                    summary += `\n${teamName} — ${groupName}:\n`;
                    for (const athleteData of athletes.slice(0, 8)) {
                      const athleteName = ((athleteData.athlete as Record<string, string>)?.displayName ?? "Unknown");
                      const statValues = athleteData.stats as string[] | undefined;
                      const labels = (statGroup.labels as string[]) ?? [];
                      const parts = labels.map((l, i) => `${l}:${statValues?.[i] ?? "-"}`).join(" ");
                      summary += `  ${athleteName}: ${parts}\n`;
                    }
                  }
                }
              }
            }
          } catch {
            // detail fetch failed — base summary is still good
          }
        }

        return { found: true, source: `ESPN/${league.toUpperCase()}`, summary };
      } catch {
        continue;
      }
    }
  }

  return { found: false, source: "", summary: "" };
}
