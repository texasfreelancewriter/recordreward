import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Player {
  id: string;
  name: string;
  jerseyNumber: string | null;
  position: string | null;
  sport: string;
  team: string;
  age: number | null;
  hometown: string | null;
  yearsWithTeam: number | null;
  yearsInLeague: number | null;
  bio: string | null;
  stats: Record<string, string>;
  references: string[];
}

export default function RosterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => api.get<Player[]>("/api/players"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/players/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast({ title: "Player removed from roster" });
    },
    onError: () => toast({ title: "Failed to delete player", variant: "destructive" }),
  });

  // Group by team
  const byTeam = players.reduce<Record<string, Player[]>>((acc, p) => {
    (acc[p.team] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-400" />
              Player Library
            </h1>
            <p className="text-gray-400 mt-1">
              Roster profiles, stats, and reference aliases used by the AI in recap stories
            </p>
          </div>
          <Button
            onClick={() => navigate("/sid/roster/new")}
            className="bg-blue-600 hover:bg-blue-500 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
        </div>

        {isLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : players.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-700 rounded-xl">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No players yet</p>
            <p className="text-gray-600 text-sm mb-6">
              Add players before the season so the AI knows correct spellings, bios, and stats
            </p>
            <Button onClick={() => navigate("/sid/roster/new")} variant="outline">
              Add First Player
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byTeam).map(([team, teamPlayers]) => (
              <div key={team}>
                <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-800 pb-2">
                  {team}
                </h2>
                <div className="space-y-2">
                  {teamPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="p-4 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        {player.jerseyNumber && (
                          <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                            #{player.jerseyNumber}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {player.position && (
                              <span className="text-gray-400 text-sm">{player.position}</span>
                            )}
                            {player.age && (
                              <span className="text-gray-500 text-sm">· Age {player.age}</span>
                            )}
                            {player.hometown && (
                              <span className="text-gray-500 text-sm">· {player.hometown}</span>
                            )}
                            {Object.keys(player.stats).length > 0 && (
                              <span className="text-gray-500 text-sm">
                                · {Object.entries(player.stats).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ")}
                              </span>
                            )}
                          </div>
                          {player.references.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {player.references.slice(0, 3).map((ref) => (
                                <Badge
                                  key={ref}
                                  variant="outline"
                                  className="text-xs border-gray-600 text-gray-400 py-0"
                                >
                                  {ref}
                                </Badge>
                              ))}
                              {player.references.length > 3 && (
                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-500 py-0">
                                  +{player.references.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/sid/roster/${player.id}`)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {player.name}?</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                This removes them from the library. It won't affect existing game sessions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-600">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(player.id)}
                                className="bg-red-600 hover:bg-red-500"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
