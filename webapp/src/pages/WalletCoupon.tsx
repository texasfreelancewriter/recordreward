import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Store, CheckCircle2, XCircle, Clock } from "lucide-react";

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

export default function WalletCoupon() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["wallet-coupons"],
    queryFn: () => api.get<WalletCoupon[]>("/api/wallet/coupons"),
  });

  const coupon = coupons?.find((c) => c.code === code?.toUpperCase());

  // Crank brightness intent — request max screen brightness on iOS Safari via meta
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const originalContent = meta?.getAttribute("content") ?? null;
    if (meta) meta.setAttribute("content", "#ffffff");
    return () => {
      if (meta && originalContent !== null) meta.setAttribute("content", originalContent);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <Skeleton className="h-8 w-24 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <p className="text-gray-600 mb-4">Coupon not found in your wallet.</p>
        <Button onClick={() => navigate("/wallet")} variant="outline">
          Back to Wallet
        </Button>
      </div>
    );
  }

  const statusMeta = {
    valid: { label: "Active", icon: Clock, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    redeemed: { label: "Already Redeemed", icon: CheckCircle2, className: "bg-blue-100 text-blue-700 border-blue-200" },
    expired: { label: "Expired", icon: XCircle, className: "bg-gray-100 text-gray-600 border-gray-300" },
  };
  const meta = statusMeta[coupon.status];
  const StatusIcon = meta.icon;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Back button */}
      <div className="p-4">
        <Link
          to="/wallet"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Wallet
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          {/* Business */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden mb-4 shadow-sm">
              {coupon.business.logoImage ? (
                <img
                  src={coupon.business.logoImage}
                  alt={coupon.business.name}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Store className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{coupon.business.name}</h1>
            <p className="text-lg text-gray-700 mt-1">{coupon.rewardText}</p>
          </div>

          {/* Big code — the whole point of this screen */}
          <div className={`rounded-2xl border-4 p-6 text-center ${
            coupon.status === "valid" ? "border-gray-900 bg-white" : "border-gray-200 bg-gray-50"
          }`}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
              {coupon.status === "valid" ? "Show at the counter" : "Coupon code"}
            </p>
            <p className="text-4xl sm:text-5xl font-bold font-mono tracking-[0.3em] text-gray-900">
              {coupon.code}
            </p>
          </div>

          {/* Status */}
          <div className="mt-6 flex justify-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${meta.className}`}>
              <StatusIcon className="h-4 w-4" />
              {meta.label}
            </span>
          </div>

          {/* Meta */}
          <div className="mt-6 space-y-2 text-center text-sm text-gray-500">
            {coupon.status === "redeemed" && coupon.redeemedAt ? (
              <p>Redeemed on {new Date(coupon.redeemedAt).toLocaleDateString()}</p>
            ) : (
              <p>Expires {new Date(coupon.expiresAt).toLocaleDateString()}</p>
            )}
            <p className="text-xs">One use per customer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
