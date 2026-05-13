'use client'

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trophy, Calendar, ChevronRight, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameSession {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  status: string;
  recapStory: string | null;
  deadline: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-gray-500" },
  analyzed: { label: "Interviews Sent", color: "bg-blue-500" },
  interviewing: { label: "Collecting Responses", color: "bg-yellow-500" },
  recap_ready: { label: "Recap Ready", color: "bg-green-500" },
  published: { label: "Published", color: "bg-purple-500" },
};

const SPORTS = ["Basketball", "Football", "Baseball", "Soccer", "Volleyball", "Hockey", "Softball", "Tennis", "Golf", "Other"];

export default function GameSessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    sport: "Basketball",
    homeTeam: "",
    awayTeam: "",
    gameDate: new Date().toISOString().split("T")[0],
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["game-sessions"],
    queryFn: () => api.get<GameSession[]>("/api/game-sessions"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post<GameSession>("/api/game-sessions", {
        ...data,
        sport: data.sport.toLowerCase(),
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["game-sessions"] });
      setShowNew(false);
      navigate(`/sid/games/${session.id}`);
    },
    onError: () => toast({ title: "Failed to create game session", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-blue-400" />
              Game Coverage
            </h1>
            <p className="text-gray-400 mt-1">AI-powered post-game interview and recap workflow</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/sid/roster")}
              className="border-gray-600 text-gray-300 hover:text-white gap-2"
            >
              <Users className="h-4 w-4" />
              Roster
            </Button>
            <Button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-500 gap-2">
              <Plus className="h-4 w-4" />
              New Game
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-700 rounded-xl">
            <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No games yet</p>
            <p className="text-gray-600 text-sm mb-6">Create a game session to start the AI interview workflow</p>
            <Button onClick={() => setShowNew(true)} variant="outline">
              Create First Game
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const status = STATUS_LABELS[session.status] ?? STATUS_LABELS.pending;
              return (
                <button
                  key={session.id}
                  onClick={() => navigate(`/sid/games/${session.id}`)}
                  className="w-full text-left p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-lg">
                        {session.awayTeam} <span className="text-gray-400">at</span> {session.homeTeam}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-gray-400 text-sm capitalize">{session.sport}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-400 text-sm flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.gameDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${status.color} text-white border-0`}>
                      {status.label}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>New Game Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Sport</label>
              <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {SPORTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Away Team</label>
              <Input
                value={form.awayTeam}
                onChange={(e) => setForm({ ...form, awayTeam: e.target.value })}
                placeholder="e.g. Round Rock Express"
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Home Team</label>
              <Input
                value={form.homeTeam}
                onChange={(e) => setForm({ ...form, homeTeam: e.target.value })}
                placeholder="e.g. Frisco RoughRiders"
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Game Date</label>
              <Input
                type="date"
                value={form.gameDate}
                onChange={(e) => setForm({ ...form, gameDate: e.target.value })}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.homeTeam || !form.awayTeam || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {createMutation.isPending ? "Creating..." : "Create Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
