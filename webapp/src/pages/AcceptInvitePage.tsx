import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { setSelectedOrgId } from "@/hooks/useOrg";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type InviteInfo = { id: string; email: string; orgName: string };

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<InviteInfo>(`/api/invites/${token}`)
      .then(setInvite)
      .catch(() => setError("This invite is invalid or has expired."));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await api.post<{ orgId: string }>(`/api/invites/${token}/accept`);
      setSelectedOrgId(result.orgId);
      setAccepted(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite.");
    } finally {
      setAccepting(false);
    }
  }

  if (isPending || (!invite && !error)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Invite Invalid</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">You're in!</h2>
          <p className="text-gray-400">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-white text-2xl font-bold mb-2">You're Invited</h1>
          <p className="text-gray-400 mb-6">
            Join <span className="text-white font-semibold">{invite?.orgName}</span> on Record Reward to view customer interviews and manage your kiosk.
          </p>

          {session ? (
            <div className="flex flex-col gap-3">
              <p className="text-gray-500 text-sm">Logged in as <span className="text-gray-300">{session.user.email}</span></p>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-white text-gray-950 hover:bg-gray-100 font-semibold"
              >
                {accepting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Accept Invitation
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-gray-400 text-sm">You need to log in first to accept this invite.</p>
              <Button
                onClick={() => navigate(`/login?redirect=/invite/${token}`)}
                className="w-full bg-white text-gray-950 hover:bg-gray-100 font-semibold"
              >
                Log In to Accept
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
