import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { setSelectedOrgId } from "@/hooks/useOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, Link as LinkIcon } from "lucide-react";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OrgSetup() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const slug = toSlug(name);
  const kioskUrl = slug
    ? `${window.location.origin}/kiosk/${slug}`
    : `${window.location.origin}/kiosk/your-slug`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.post<{ id: string }>("/api/organizations", { name: name.trim(), slug });
      setSelectedOrgId(result.id);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard?tab=settings"), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.toLowerCase().includes("slug") || msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("taken")) {
        setError("This URL is already taken, try a different name.");
      } else {
        setError(msg || "Failed to create organization. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Set Up Your Business</h1>
          <p className="text-gray-400 mt-2">Create your kiosk in under a minute</p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Business Details</CardTitle>
            <CardDescription className="text-gray-400">
              This creates your kiosk URL that customers will use
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="rounded-full bg-green-500/10 p-3">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <p className="text-white font-semibold">Organization created!</p>
                <p className="text-gray-400 text-sm">Redirecting to settings...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-gray-300">Business Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Taco Rio Restaurant"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500"
                  />
                </div>

                {/* Kiosk URL preview */}
                <div className="flex flex-col gap-2">
                  <Label className="text-gray-300">Your Kiosk URL</Label>
                  <div className="flex items-center gap-2 rounded-lg bg-gray-800/60 border border-gray-700 px-3 py-2.5">
                    <LinkIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-mono text-gray-300 break-all">
                      {window.location.origin}/kiosk/
                      <span className={slug ? "text-white font-semibold" : "text-gray-500"}>
                        {slug || "your-slug"}
                      </span>
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    This is the link you'll share with customers at your kiosk
                  </p>
                </div>

                {error ? (
                  <p className="text-red-400 text-sm">{error}</p>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading || !slug}
                  className="w-full bg-white text-gray-950 hover:bg-gray-100 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create My Kiosk"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
