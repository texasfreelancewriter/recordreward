import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authClient, useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      api.get<Array<{ id: string }>>("/api/organizations/mine").catch(() => []).then((orgs) => {
        window.location.href = orgs && orgs.length > 0 ? "/dashboard" : "/wallet";
      });
    }
  }, [isPending, session, redirect]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
      setStep("otp");
    } catch {
      setError("Failed to send code. Check the email and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.emailOtp({ email, otp });
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      const orgs = await api.get<Array<{ id: string }>>("/api/organizations/mine").catch(() => []);
      if (orgs && orgs.length > 0) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/wallet";
      }
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/record-reward-logo.png" alt="Record Reward" className="h-20 mx-auto mb-6" />
          <p className="text-gray-400 mt-2">
            {step === "email" ? "Enter your email to get started" : `We sent a code to ${email}`}
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">
              {step === "email" ? "Your email address" : "Enter verification code"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {step === "email"
                ? "We'll send you a one-time login code"
                : "Check your inbox for the 6-digit code"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500"
                  />
                </div>
                {error ? (
                  <p className="text-red-400 text-sm">{error}</p>
                ) : null}
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-white text-gray-950 hover:bg-gray-100 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Code"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="otp" className="text-gray-300">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    disabled={loading}
                    maxLength={6}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 text-center text-xl tracking-widest"
                  />
                </div>
                {error ? (
                  <p className="text-red-400 text-sm">{error}</p>
                ) : null}
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-white text-gray-950 hover:bg-gray-100 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  className="text-gray-500 hover:text-gray-300 text-sm text-center transition-colors"
                >
                  Use a different email
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

