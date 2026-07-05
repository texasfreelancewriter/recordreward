import { Component, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RecordRewardLanding from "./pages/RecordRewardLanding";
import Dashboard from "./pages/Dashboard";
import ViewInterviewPage from "./pages/interviews/ViewInterviewPage";
import RecordInterviewPage from "./pages/interviews/RecordInterviewPage";
import QuestionsPage from "./pages/admin/QuestionsPage";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import OrgSetup from "./pages/OrgSetup";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import KioskPage from "./pages/KioskPage";
import CommercialProjectsPage from "./pages/commercial/CommercialProjectsPage";
import NewCommercialPage from "./pages/commercial/NewCommercialPage";
import CommercialProjectPage from "./pages/commercial/CommercialProjectPage";
import Wallet from "./pages/Wallet";
import WalletCoupon from "./pages/WalletCoupon";
import { AuthGuard } from "./components/AuthGuard";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: "white", background: "#111", minHeight: "100vh" }}>
          <h2 style={{ color: "#f87171" }}>Something went wrong</h2>
          <pre style={{ fontSize: 12, opacity: 0.7, whiteSpace: "pre-wrap" }}>
            {(this.state.error as Error).message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              window.location.hostname === "app.recordreward.com" || window.location.hostname === "record-reward-app.pages.dev"
                ? <Navigate to="/login" replace />
                : <RecordRewardLanding />
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<AuthGuard><OrgSetup /></AuthGuard>} />
            <Route path="/invite/:token" element={<AcceptInvitePage />} />
            <Route path="/kiosk/:slug" element={<KioskPage />} />
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/interviews" element={<Navigate to="/dashboard" replace />} />
            <Route path="/interviews/:id" element={<AuthGuard><ViewInterviewPage /></AuthGuard>} />
            <Route path="/interviews/:id/record" element={<AuthGuard><RecordInterviewPage /></AuthGuard>} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/questions" element={<AuthGuard><QuestionsPage /></AuthGuard>} />
            <Route path="/settings" element={<Navigate to="/dashboard?tab=settings" replace />} />
            <Route path="/commercial" element={<AuthGuard><CommercialProjectsPage /></AuthGuard>} />
            <Route path="/commercial/new" element={<AuthGuard><NewCommercialPage /></AuthGuard>} />
            <Route path="/commercial/:id" element={<AuthGuard><CommercialProjectPage /></AuthGuard>} />
            <Route path="/wallet" element={<AuthGuard><Wallet /></AuthGuard>} />
            <Route path="/wallet/:code" element={<AuthGuard><WalletCoupon /></AuthGuard>} />
            <Route path="/kiosk-legacy" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
