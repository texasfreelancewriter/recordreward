import { useState } from "react";
import {
  Star,
  Video,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Play,
  Gift,
  Check,
  Mail,
  Clock,
  Users,
  Share2,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  Store,
  Wallet,
  Bell,
  Smartphone,
} from "lucide-react";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Benefits", href: "#benefits" },
  { label: "Industries", href: "#industries" },
  { label: "Demo", href: "#demo" },
  { label: "Wallet", href: "#wallet" },
];

const STEPS = [
  {
    number: "01",
    title: "Customer Rates Visit",
    body: "At checkout, the kiosk asks customers to rate their visit and earn a reward for sharing.",
  },
  {
    number: "02",
    title: "They Record a Video",
    body: "Customers record a short, authentic video right at the moment of experience — no scripting needed.",
  },
  {
    number: "03",
    title: "They Get Rewarded",
    body: "A reward — free appetizer, discount, or offer — lands in their inbox before they leave.",
  },
  {
    number: "04",
    title: "Videos in Dashboard",
    body: "Every submission is organized in your dashboard and ready to review, approve, or dismiss.",
  },
  {
    number: "05",
    title: "Approve & Post to Social",
    body: "Watch the clip, approve it with one click, and share directly to Instagram and Facebook.",
  },
];

const BENEFITS = [
  {
    stat: "+47%",
    statLabel: "Review Volume",
    Icon: Star,
    title: "More Public 5-Star Reviews",
    body: "Funnel your best customer experiences into public review platforms and boost your reputation.",
  },
  {
    stat: "30s",
    statLabel: "Average Clip",
    Icon: Video,
    title: "Authentic Video Reviews",
    body: "Real customers. Real reactions. Content you can use across your website and social channels.",
  },
  {
    stat: "3.4×",
    statLabel: "Repeat Visits",
    Icon: Users,
    title: "Repeat Customers",
    body: "Auto-rewards bring customers back within days — without a loyalty program.",
  },
  {
    stat: "12+",
    statLabel: "Clips/Month",
    Icon: Sparkles,
    title: "Content for Social Media",
    body: "Turn customer videos into Reels, TikToks, and posts in one click.",
  },
];

const INDUSTRIES = [
  {
    title: "Restaurants",
    body: "Capture reviews while customers pay and bring them back with a free appetizer.",
    img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&auto=format&fit=crop",
  },
  {
    title: "Spas & Salons",
    body: "Turn satisfied clients into loyal, repeat visitors with simple rewards.",
    img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80&auto=format&fit=crop",
  },
  {
    title: "Gyms & Studios",
    body: "Collect real member testimonials and keep them coming back.",
    img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80&auto=format&fit=crop",
  },
  {
    title: "Bowling & Entertainment",
    body: "Capture the fun and turn it into repeat visits and social content.",
    img: "/bowling-spare-birdie.jpg",
  },
];

const DASHBOARD_ROWS = [
  { name: "Sarah Mendez", stars: 5, loc: "Bella Vita", time: "2 min ago", status: "PENDING APPROVAL", cls: "text-yellow-400 bg-yellow-400/10" },
  { name: "Mike Thompson", stars: 4, loc: "Bella Vita", time: "18 min ago", status: "APPROVED", cls: "text-green-400 bg-green-400/10" },
  { name: "Lisa Kim", stars: 4, loc: "Bella Vita", time: "1 hr ago", status: "RECORDED", cls: "text-blue-400 bg-blue-400/10" },
  { name: "David Park", stars: 5, loc: "Bella Vita", time: "3 hr ago", status: "APPROVED", cls: "text-green-400 bg-green-400/10" },
];

const WALLET_CARDS = [
  {
    initials: "LR",
    biz: "Los Reyes Restaurant",
    reward: "Free Appetizer",
    code: "THANKS-A7K2",
    status: "Active",
    statusCls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  {
    initials: "BV",
    biz: "Bella Vita Trattoria",
    reward: "10% Off Your Order",
    code: "THANKS-B3M9",
    status: "Active",
    statusCls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  {
    initials: "CP",
    biz: "Cedar Park Fitness",
    reward: "Free Guest Pass",
    code: "THANKS-C6P1",
    status: "Used",
    statusCls: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
];

export default function RecordRewardLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-[#0b0b0b] text-white min-h-screen">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b]/90 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors">Log In</a>
            <a
              href="mailto:texasfreelancewriter@gmail.com?subject=Record Reward Demo Request"
              className="text-sm bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Get a Demo
            </a>
            <button className="md:hidden text-gray-400" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#0f0f0f] border-t border-white/5 px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="text-sm text-gray-400" onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="pt-16 min-h-screen relative overflow-hidden flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-black/30" />

        <div className="max-w-6xl mx-auto px-6 py-14 relative w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.05] mb-6">
                Turn Customer Visits Into{" "}
                <span className="text-green-500">Video Reviews</span>{" "}
                and{" "}
                <span className="text-green-500">Repeat Business</span>
              </h1>

              <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-xl">
                Capture real video reviews at the point of experience and automatically reward customers with offers that bring them back.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black px-7 py-3.5 rounded-xl font-bold transition-colors"
                >
                  How It Works
                  <ChevronDown className="h-4 w-4" />
                </a>
                <a
                  href="mailto:texasfreelancewriter@gmail.com?subject=Record Reward Demo Request"
                  className="inline-flex items-center justify-center border border-white/15 hover:border-white/30 text-white px-7 py-3.5 rounded-xl font-medium transition-colors"
                >
                  Get a Demo
                </a>
              </div>

              <p className="text-gray-600 text-sm">
                Works on any tablet &nbsp;·&nbsp; Takes minutes to launch
              </p>
            </div>

            {/* iPad kiosk — angled product shot */}
            <div className="hidden lg:flex justify-end items-center">
              <img
                src="/ipad-kiosk.png"
                alt="Record Reward kiosk on iPad stand"
                className="w-[540px] max-w-none drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Bar ─────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-[#0f0f0f] py-8 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { Icon: Star, title: "More Public 5-Star Reviews", body: "Turn happy customers into reviews on Google and Yelp." },
            { Icon: Video, title: "Authentic Video Reviews", body: "Capture real customer experiences — not scripted testimonials." },
            { Icon: RefreshCw, title: "Repeat Customers", body: "Automatically reward customers and bring them back." },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                <f.Icon className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">{f.title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-green-500 text-xs font-bold uppercase tracking-[0.2em] border border-green-500/30 bg-green-500/5 rounded-full px-4 py-1.5 mb-5">
              Process
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              How <span className="text-green-500">Record Reward</span> Works
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              From checkout to repeat visit — five simple steps that run on autopilot.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.number} className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-green-500/15 transition-colors">
                <span className="text-green-500 text-xs font-bold uppercase tracking-wider">Step {step.number}</span>
                <div className="bg-[#0f1923] rounded-xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "9/16" }}>
                  <StepMockup index={i} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm mb-1.5">{step.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────── */}
      <section id="benefits" className="py-14 px-6 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <span className="text-green-500 text-xs font-bold uppercase tracking-[0.2em]">Benefits</span>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-lg">
                Everything You Need to Grow Your <span className="text-green-500">Business</span>
              </h2>
              <p className="text-gray-400 text-sm max-w-xs">One simple system. Multiple ways to drive revenue.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-[#111] border border-white/5 rounded-2xl p-8 hover:border-green-500/20 transition-colors">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <b.Icon className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-green-500">{b.stat}</p>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">{b.statLabel}</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{b.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ──────────────────────────────────────────── */}
      <section id="industries" className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-green-500 text-xs font-bold uppercase tracking-[0.2em] border border-green-500/30 bg-green-500/5 rounded-full px-4 py-1.5 mb-5">
              Industries
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              Perfect for <span className="text-green-500">Local Businesses</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Anywhere customers walk in happy, Record Reward turns that moment into growth.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {INDUSTRIES.map(ind => (
              <div key={ind.title} className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-default">
                <img
                  src={ind.img}
                  alt={ind.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-base mb-1">{ind.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{ind.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo ────────────────────────────────────────────── */}
      <section id="demo" className="py-14 px-6 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block text-green-500 text-xs font-bold uppercase tracking-[0.2em] border border-green-500/30 bg-green-500/5 rounded-full px-4 py-1.5 mb-6">
                Live Demo
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                See What Your Customers <span className="text-green-500">Actually Say</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Real video feedback builds trust, drives new customers, and gives you content you can use everywhere.
              </p>
              <a
                href="mailto:texasfreelancewriter@gmail.com?subject=Record Reward Demo Request"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-xl font-bold transition-colors mb-12"
              >
                <Mail className="h-4 w-4" />
                Request a Demo
              </a>

            </div>

            {/* Video player mockup */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="relative aspect-[4/3]">
                <img
                  src="/screenshot-review-woman.png"
                  alt="Real customer video review in the Record Reward dashboard"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400 transition-colors cursor-pointer shadow-xl">
                    <Play className="h-7 w-7 text-black fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-xs font-medium">Customer Review</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div className="h-full bg-green-500 w-[30%]" />
                </div>
                <div className="absolute bottom-4 right-4 flex items-center gap-2 text-white text-xs">
                  <span>0:09 / 0:30</span>
                </div>
              </div>
              <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-xs">SM</div>
                  <div>
                    <p className="text-white text-sm font-semibold">Sarah M.</p>
                    <div className="flex items-center gap-1.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-green-400 text-green-400" />)}
                      <span className="text-gray-500 text-xs ml-1">Los Reyes Mexican Restaurant</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm italic">"Best TexMex in town — coming back this Friday!"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dashboard ────────────────────────────────────────────── */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Dashboard mockup */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 bg-[#0b0b0b] rounded-md px-3 py-1 text-xs text-gray-500 text-center">app.recordreward.com/dashboard</div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Submissions</p>
                    <p className="text-white font-bold text-xl">Inbox</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-[#1a1a1a] border border-white/5 rounded-lg px-3 py-1.5 text-gray-500 text-xs">Search...</div>
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-xs">●</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[{ label: "Today", val: "12" }, { label: "Pending", val: "3" }, { label: "Avg Rating", val: "4.9" }].map(s => (
                    <div key={s.label} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">{s.label}</p>
                      <p className="text-white font-black text-2xl">{s.val}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {DASHBOARD_ROWS.map(row => (
                    <div key={row.name} className="flex items-center justify-between bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                          <Video className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-white text-xs font-semibold">{row.name}</p>
                            <div className="flex gap-0.5">
                              {Array.from({ length: row.stars }).map((_, i) => (
                                <Star key={i} className="h-2.5 w-2.5 fill-green-400 text-green-400" />
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-600 text-[10px]">{row.loc} · {row.time}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${row.cls}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="text-green-500 text-xs font-bold uppercase tracking-[0.2em]">Dashboard</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mt-3 mb-6 leading-tight">
                Manage Everything In One <span className="text-green-500">Place</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Every submission, reward, and customer interaction — organized in a clean, simple dashboard.
              </p>
              <div className="space-y-4 mb-10">
                {[
                  "Review and approve submissions",
                  "Download videos in seconds",
                  "Post directly to social media",
                  "Track engagement and performance",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <p className="text-gray-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
              <a
                href="mailto:texasfreelancewriter@gmail.com?subject=Record Reward Demo Request"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-xl font-bold transition-colors"
              >
                View Dashboard
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Automation ──────────────────────────────────────────── */}
      <section className="py-14 px-6 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-green-500 text-xs font-bold uppercase tracking-[0.2em]">Automation</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mt-3 mb-6 leading-tight">
                Rewards Sent Automatically. Customers Come Back{" "}
                <span className="text-green-500">Automatically.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                Set it once. Every review triggers a reward, bringing customers back without extra work.
              </p>
              <div className="space-y-6">
                {[
                  { Icon: Mail, title: "Instant email delivery", body: "Reward lands in their inbox before they leave the parking lot." },
                  { Icon: Gift, title: "Custom reward offers", body: "Free appetizer, discounts, BOGO — you choose what works." },
                  { Icon: Clock, title: "Expiration timers that create urgency", body: "Limited-time offers drive customers back within days." },
                  { Icon: TrendingUp, title: "Drives repeat visits", body: "Customers who redeem rewards return 3.4× more often." },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                      <f.Icon className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm mb-0.5">{f.title}</p>
                      <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email mockup */}
            <div className="space-y-3">
              <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 text-xs mb-0.5">From: Bella Vita Trattoria</p>
                    <p className="text-white text-sm font-semibold truncate">Thanks for your feedback — Free Appetizer Inside</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-green-400 text-[10px] font-semibold">Auto-sent</p>
                  <p className="text-gray-600 text-[10px]">3.2 seconds ago</p>
                </div>
              </div>

              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Your Reward</p>
                    <p className="text-gray-300 text-sm">Thanks for the 5★ review, Sarah!</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">Free Appetizer</h3>
                <p className="text-gray-400 text-sm mb-6">On your next visit, on us.</p>
                <div className="bg-[#0b0b0b] border border-white/10 rounded-xl p-4 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Code</p>
                    <p className="text-white font-black text-xl tracking-[0.15em]">THANKS-SM5</p>
                  </div>
                  <button className="bg-green-500 hover:bg-green-400 text-black font-bold text-sm px-5 py-2.5 rounded-lg transition-colors">REDEEM</button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Expires in 14 days</span>
                  </div>
                  <span>1 use per guest</span>
                </div>
              </div>
              <p className="text-center text-gray-600 text-xs">Show this email at the door. We can't wait to see you again.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Customer Wallet ─────────────────────────────────────── */}
      <section id="wallet" className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Phone mockups */}
            <div className="flex items-end justify-center gap-3 py-6">

              {/* Phone 1 — Wallet list (dark) */}
              <div className="w-[190px] shrink-0 bg-gray-950 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="bg-black h-7 flex items-center justify-center">
                  <div className="w-20 h-1.5 bg-white/15 rounded-full" />
                </div>
                <div className="bg-gradient-to-b from-gray-950 to-gray-900 p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-bold text-xs">My Wallet</p>
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                      <Bell className="h-2.5 w-2.5 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-[8px] mb-3">sarah@gmail.com</p>
                  {/* Filter chips */}
                  <div className="flex gap-1.5 mb-3 overflow-hidden">
                    <span className="bg-white text-gray-900 text-[7px] font-bold px-2 py-0.5 rounded-full shrink-0">All (3)</span>
                    <span className="bg-white/10 text-gray-400 text-[7px] px-2 py-0.5 rounded-full shrink-0 border border-white/10">Active</span>
                    <span className="bg-white/10 text-gray-400 text-[7px] px-2 py-0.5 rounded-full shrink-0 border border-white/10">Used</span>
                  </div>
                  {/* Coupon cards */}
                  <div className="space-y-2">
                    {WALLET_CARDS.map(c => (
                      <div key={c.biz} className="bg-white/5 border border-white/10 rounded-xl p-2.5 hover:bg-white/8 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0 text-[6px] font-bold text-green-400">
                            {c.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-white text-[8px] font-semibold leading-tight truncate">{c.biz}</p>
                              <span className={`shrink-0 text-[6px] font-bold px-1.5 py-0.5 rounded-full border ${c.statusCls}`}>
                                {c.status}
                              </span>
                            </div>
                            <p className="text-gray-400 text-[7px] mt-0.5 truncate">{c.reward}</p>
                            <p className="text-white/50 font-mono text-[7px] tracking-wider mt-1">{c.code}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-black h-5 flex items-center justify-center">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>
              </div>

              {/* Phone 2 — Counter view (white), raised */}
              <div className="w-[190px] shrink-0 bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-2xl -translate-y-6">
                <div className="bg-gray-100 h-7 flex items-center justify-center">
                  <div className="w-20 h-1.5 bg-gray-300 rounded-full" />
                </div>
                <div className="p-4 flex flex-col items-center min-h-[320px] justify-center">
                  {/* Back */}
                  <div className="w-full flex items-center gap-1 mb-5">
                    <ChevronRight className="h-3 w-3 text-gray-400 rotate-180" />
                    <span className="text-gray-500 text-[8px]">Wallet</span>
                  </div>
                  {/* Business logo */}
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3 shadow-sm">
                    <span className="text-red-600 font-black text-lg">LR</span>
                  </div>
                  <p className="text-gray-900 font-bold text-[10px] text-center mb-0.5">Los Reyes Restaurant</p>
                  <p className="text-gray-500 text-[8px] text-center mb-5">Free Appetizer with any order</p>
                  {/* Big code box */}
                  <div className="w-full border-4 border-gray-900 rounded-xl p-3 text-center mb-4">
                    <p className="text-[7px] uppercase tracking-[0.15em] text-gray-500 mb-2">Show at the counter</p>
                    <p className="text-xl font-black font-mono tracking-[0.15em] text-gray-900">A7K2</p>
                  </div>
                  {/* Status badge */}
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[8px] font-semibold px-2 py-1 rounded-full border border-emerald-200">
                    <Clock className="h-2 w-2" />
                    Active · Expires in 18 days
                  </span>
                </div>
                <div className="bg-gray-100 h-5 flex items-center justify-center">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
              </div>
            </div>

            {/* Copy */}
            <div>
              <span className="text-green-500 text-xs font-bold uppercase tracking-[0.2em]">Customer Wallet</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mt-3 mb-6 leading-tight">
                Rewards Customers <span className="text-green-500">Actually Use</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Every reward earned goes straight into the customer's digital wallet. No paper coupons, no app download. Just a tap to redeem at the counter.
              </p>
              <div className="space-y-4 mb-10">
                {[
                  { Icon: Wallet, text: "All rewards in one place across every participating business" },
                  { Icon: Smartphone, text: "Full-screen code display — crystal clear at the counter" },
                  { Icon: Bell, text: "Automatic email reminders before rewards are about to expire" },
                  { Icon: Check, text: "Works on any phone browser, no app download required" },
                ].map(item => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <item.Icon className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed pt-1.5">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* Stat row */}
              <div className="grid grid-cols-3 gap-3 p-5 bg-[#111] border border-white/5 rounded-2xl">
                {[
                  { num: "30 days", label: "Coupon validity" },
                  { num: "2×", label: "Reminder emails" },
                  { num: "1 scan", label: "Instant redemption" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-green-400 font-black text-xl">{s.num}</p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-green-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Ready to Turn Visits Into <span className="text-green-500">Revenue?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Get set up in minutes. No setup fee. Works on the tablet you already have.
          </p>
          <a
            href="mailto:texasfreelancewriter@gmail.com?subject=Record Reward Demo Request&body=Hi, I'd like to request a demo of Record Reward for my business."
            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black px-10 py-4 rounded-xl text-base font-bold transition-colors"
          >
            Get a Demo
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo small />
          <p className="text-gray-600 text-sm">© 2026 Record Reward. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="mailto:texasfreelancewriter@gmail.com?subject=Record Reward Demo Request" className="hover:text-white transition-colors">Contact</a>
            <a href="/login" className="hover:text-white transition-colors">Sign In</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

function Logo({ small }: { small?: boolean }) {
  return (
    <img
      src="/record-reward-logo.png"
      alt="Record Reward"
      className={small ? "h-8" : "h-10"}
    />
  );
}

function StepMockup({ index }: { index: number }) {
  // Step 1: kiosk start screen with star rating overlay
  if (index === 0) {
    return (
      <div className="relative w-full h-full">
        <img
          src="/screenshot-kiosk-start.jpg"
          alt="Customer rates their visit on kiosk"
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
          <p className="text-white/70 text-[7px] font-semibold uppercase tracking-widest">Rate Your Visit</p>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400 drop-shadow" />)}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: woman recording in Mexican restaurant
  if (index === 1) {
    return (
      <img
        src="/screenshot-record-woman.png"
        alt="Customer recording video review at restaurant"
        className="w-full h-full object-contain"
      />
    );
  }

  // Step 3: thanks / reward screen
  if (index === 2) {
    return (
      <img
        src="/screenshot-kiosk-thanks.png"
        alt="Thanks for your feedback — reward sent"
        className="w-full h-full object-contain"
      />
    );
  }

  // Step 4: dashboard with interview submissions
  if (index === 3) {
    return (
      <img
        src="/screenshot-dashboard-samples.png"
        alt="Dashboard showing customer interview submissions"
        className="w-full h-full object-contain"
      />
    );
  }

  // Step 5: replay clip showing woman's review in the approval screen
  return (
    <img
      src="/screenshot-replay-clip.png"
      alt="Business owner reviewing customer video submission"
      className="w-full h-full object-contain"
    />
  );
}
