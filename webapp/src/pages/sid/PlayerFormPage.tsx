import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlayerFormData {
  name: string;
  jerseyNumber: string;
  position: string;
  sport: string;
  team: string;
  age: string;
  hometown: string;
  yearsWithTeam: string;
  yearsInLeague: string;
  bio: string;
  stats: { key: string; value: string }[];
  references: string[];
}

const SPORTS = ["Baseball", "Basketball", "Football", "Soccer", "Volleyball", "Hockey", "Softball", "Other"];

const BLANK: PlayerFormData = {
  name: "",
  jerseyNumber: "",
  position: "",
  sport: "Baseball",
  team: "",
  age: "",
  hometown: "",
  yearsWithTeam: "",
  yearsInLeague: "",
  bio: "",
  stats: [],
  references: [],
};

export default function PlayerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<PlayerFormData>(BLANK);
  const [newRef, setNewRef] = useState("");
  const [newStatKey, setNewStatKey] = useState("");
  const [newStatValue, setNewStatValue] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["player", id],
    queryFn: () => api.get<Record<string, unknown>>(`/api/players/${id}`),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: String(existing.name ?? ""),
      jerseyNumber: String(existing.jerseyNumber ?? ""),
      position: String(existing.position ?? ""),
      sport: String(existing.sport ?? "Baseball"),
      team: String(existing.team ?? ""),
      age: existing.age ? String(existing.age) : "",
      hometown: String(existing.hometown ?? ""),
      yearsWithTeam: existing.yearsWithTeam ? String(existing.yearsWithTeam) : "",
      yearsInLeague: existing.yearsInLeague ? String(existing.yearsInLeague) : "",
      bio: String(existing.bio ?? ""),
      stats: Object.entries((existing.stats as Record<string, string>) ?? {}).map(([key, value]) => ({ key, value })),
      references: (existing.references as string[]) ?? [],
    });
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (data: PlayerFormData) => {
      const payload = {
        name: data.name,
        jerseyNumber: data.jerseyNumber || undefined,
        position: data.position || undefined,
        sport: data.sport.toLowerCase(),
        team: data.team,
        age: data.age ? parseInt(data.age) : undefined,
        hometown: data.hometown || undefined,
        yearsWithTeam: data.yearsWithTeam ? parseInt(data.yearsWithTeam) : undefined,
        yearsInLeague: data.yearsInLeague ? parseInt(data.yearsInLeague) : undefined,
        bio: data.bio || undefined,
        stats: Object.fromEntries(data.stats.filter((s) => s.key).map((s) => [s.key, s.value])),
        references: data.references,
      };
      return isNew
        ? api.post("/api/players", payload)
        : api.put(`/api/players/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast({ title: isNew ? "Player added to roster" : "Player updated" });
      navigate("/sid/roster");
    },
    onError: () => toast({ title: "Failed to save player", variant: "destructive" }),
  });

  const addRef = () => {
    const trimmed = newRef.trim();
    if (!trimmed || form.references.includes(trimmed)) return;
    setForm({ ...form, references: [...form.references, trimmed] });
    setNewRef("");
  };

  const removeRef = (ref: string) =>
    setForm({ ...form, references: form.references.filter((r) => r !== ref) });

  const addStat = () => {
    if (!newStatKey.trim()) return;
    setForm({ ...form, stats: [...form.stats, { key: newStatKey.trim(), value: newStatValue.trim() }] });
    setNewStatKey("");
    setNewStatValue("");
  };

  const removeStat = (i: number) =>
    setForm({ ...form, stats: form.stats.filter((_, idx) => idx !== i) });

  const updateStat = (i: number, field: "key" | "value", val: string) => {
    const updated = [...form.stats];
    updated[i] = { ...updated[i], [field]: val };
    setForm({ ...form, stats: updated });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/sid/roster")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Roster
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Users className="h-7 w-7 text-blue-400" />
          <h1 className="text-2xl font-bold">{isNew ? "Add Player" : "Edit Player"}</h1>
        </div>

        <div className="space-y-8">
          {/* Identity */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Identity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">Full Name (exact spelling)</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Wyatt Langenhörst"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Jersey #</label>
                <Input
                  value={form.jerseyNumber}
                  onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                  placeholder="8"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Position</label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="SS, OF, LHP…"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Sport</label>
                <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Team</label>
                <Input
                  value={form.team}
                  onChange={(e) => setForm({ ...form, team: e.target.value })}
                  placeholder="Round Rock Express"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
            </div>
          </section>

          {/* Bio */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Bio Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Age</label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="24"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Hometown</label>
                <Input
                  value={form.hometown}
                  onChange={(e) => setForm({ ...form, hometown: e.target.value })}
                  placeholder="Omaha, Nebraska"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Seasons with this team</label>
                <Input
                  type="number"
                  value={form.yearsWithTeam}
                  onChange={(e) => setForm({ ...form, yearsWithTeam: e.target.value })}
                  placeholder="2"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Total seasons in league</label>
                <Input
                  type="number"
                  value={form.yearsInLeague}
                  onChange={(e) => setForm({ ...form, yearsInLeague: e.target.value })}
                  placeholder="4"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">Bio / Notes</label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Any additional context for the AI — draft round, prospect ranking, call-up history…"
                  className="bg-gray-800 border-gray-600 resize-none"
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* Stats */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Season Stats</h2>
            <p className="text-xs text-gray-500 mb-4">Add whatever stats are relevant — AVG, HR, RBI, ERA, assists, etc.</p>
            <div className="space-y-2">
              {form.stats.map((stat, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={stat.key}
                    onChange={(e) => updateStat(i, "key", e.target.value)}
                    placeholder="Stat"
                    className="bg-gray-800 border-gray-600 w-28"
                  />
                  <Input
                    value={stat.value}
                    onChange={(e) => updateStat(i, "value", e.target.value)}
                    placeholder="Value"
                    className="bg-gray-800 border-gray-600 flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStat(i)}
                    className="text-gray-500 hover:text-red-400 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 items-center">
                <Input
                  value={newStatKey}
                  onChange={(e) => setNewStatKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStat()}
                  placeholder="AVG"
                  className="bg-gray-800 border-gray-600 w-28"
                />
                <Input
                  value={newStatValue}
                  onChange={(e) => setNewStatValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStat()}
                  placeholder=".312"
                  className="bg-gray-800 border-gray-600 flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addStat}
                  className="border-gray-600 px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* Reference Aliases */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Reference Aliases</h2>
            <p className="text-xs text-gray-500 mb-4">
              Phrases the AI uses instead of repeating the player's name — "the shortstop from Omaha", "the 24-year-old in his second season with the Express"
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {form.references.map((ref) => (
                <Badge
                  key={ref}
                  variant="outline"
                  className="border-blue-700 text-blue-300 gap-1.5 py-1 pl-3 pr-2"
                >
                  {ref}
                  <button onClick={() => removeRef(ref)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRef()}
                placeholder="the shortstop from Omaha, Nebraska"
                className="bg-gray-800 border-gray-600 flex-1"
              />
              <Button variant="outline" onClick={addRef} className="border-gray-600 gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <Button
              variant="ghost"
              onClick={() => navigate("/sid/roster")}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name || !form.team || saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {saveMutation.isPending ? "Saving..." : isNew ? "Add to Roster" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
