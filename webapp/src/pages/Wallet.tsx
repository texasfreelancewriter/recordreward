import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, LogOut, Store, Clock, CheckCircle2, XCircle } from "lucide-react";

type WalletCoupon = {
  id: string;
  code: string;
  rewardText: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  status: "valid" | "redeemed" | "expired";
  business: {
    id: string;
    name: string;
    slug: string;
    logoImage: string | null;
  };
};

type Filter = "all" | "valid" | "redeemed" | "expired";

export default function Wallet() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: coupons, isLoading, error } = useQuery({
    queryKey: ["wallet-coupons"],
    queryFn: () => api.get<WalletCoupon[]>("/api/wallet/coupons"),
  });

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const filtered = (coupons ?? []).filter((c) => filter === "all" || c.status === filter);
  const counts = {
    all: coupons?.length ?? 0,
    valid: coupons?.filter((c) => c.status === "valid").length ?? 0,
    redeemed: coupons?.filter((c) => c.status === "redeemed").length ?? 0,
    expired: coupons?.filter((c) => c.status === "expired").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Wallet</h1>
            {session?.user?.email ? (
              <p className="text-sm text-gray-400 mt-1">{session.user.email}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign Out
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 bg-white/5" />
            <Skeleton className="h-28 bg-white/5" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">Failed to load your wallet.</p>
          </div>
        ) : counts.all === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Filter chips */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {(["all", "valid", "redeemed", "expired"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filter === f
                      ? "bg-white text-gray-950 border-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {f === "all" ? `All (${counts.all})` :
                   f === "valid" ? `Active (${counts.valid})` :
                   f === "redeemed" ? `Redeemed (${counts.redeemed})` :
                   `Expired (${counts.expired})`}
                </button>
              ))}
            </div>

            {/* Coupon cards */}
            <div className="flex flex-col gap-3">
              {filtered.map((c) => (
                <CouponCard key={c.id} coupon={c} />
              ))}
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">
                  No coupons in this filter.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CouponCard({ coupon }: { coupon: WalletCoupon }) {
  const statusMeta = {
    valid: { label: "Active", icon: Clock, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    redeemed: { label: "Redeemed", icon: CheckCircle2, className: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
    expired: { label: "Expired", icon: XCircle, className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
  };
  const meta = statusMeta[coupon.status];
  const StatusIcon = meta.icon;

  return (
    <Link to={`/wallet/${coupon.code}`} className="block">
      <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition-all overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {coupon.business.logoImage ? (
                <img src={coupon.business.logoImage} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <Store className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{coupon.business.name}</p>
                  <p className="text-sm text-gray-300 truncate">{coupon.rewardText}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${meta.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {meta.label}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-mono text-sm tracking-widest text-white/90">{coupon.code}</span>
                <span className="text-xs text-gray-500">
                  {coupon.status === "redeemed" && coupon.redeemedAt
                    ? `Used ${new Date(coupon.redeemedAt).toLocaleDateString()}`
                    : `Expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <Card className="bg-white/5 border-white/10 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center mb-4">
          <Ticket className="h-7 w-7 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Your wallet is empty</h2>
        <p className="text-sm text-gray-400 mt-2 max-w-sm">
          Rewards you earn at RecordReward businesses will show up here. Visit a participating spot and leave a video review to get started.
        </p>
      </CardContent>
    </Card>
  );
}
