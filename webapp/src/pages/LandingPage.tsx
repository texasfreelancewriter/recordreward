import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Mic2,
  FileText,
  Users,
  Zap,
  CheckCircle,
  ChevronRight,
  Play,
  BookOpen,
  Trophy,
  Radio,
  Quote,
  Tv,
  Crosshair,
  Smartphone,
  Video,
  Brain,
  Share2,
} from "lucide-react";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Who It's For", href: "#who" },
];

const STEPS = [
  {
    number: "1",
    icon: <Tv className="h-7 w-7" />,
    title: "Broadcast Transcript",
    body: "AI listens to the broadcast and creates a transcript.",
  },
  {
    number: "2",
    icon: <Crosshair className="h-7 w-7" />,
    title: "Identify Big Moments",
    body: "AI analyzes the transcript and identifies athletes with standout moments.",
  },
  {
    number: "3",
    icon: <Smartphone className="h-7 w-7" />,
    title: "Send Questions to Athletes",
    body: "Personalized questions are sent to athletes on their phone or laptop in the locker room.",
  },
  {
    number: "4",
    icon: <Video className="h-7 w-7" />,
    title: "Athletes Respond",
    body: "Athletes answer the questions with text or video. Responses are sent back to the AI.",
  },
  {
    number: "5",
    icon: <Brain className="h-7 w-7" />,
    title: "AI Writes the Story",
    body: "AI crafts a story using the transcript, athlete responses, and key game moments.",
  },
  {
    number: "6",
    icon: <Share2 className="h-7 w-7" />,
    title: "Publish & Share Everywhere",
    body: "The story and videos are ready for your website, social media, and beyond.",
  },
];

const FEATURES = [
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Player Library",
    body: "Input your full roster before the season — correct spellings, jersey numbers, bios, hometowns, years in the league. The AI uses your data, not a guess.",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "AI-Personalized Questions",
    body: "Questions are generated from what actually happened in the game. Yamamoto gets asked about commanding his fastball in the 7th. Smith gets asked about the walk-off. Not generic postgame boilerplate.",
  },
  {
    icon: <Mic2 className="h-5 w-5" />,
    title: "Video on Any Device",
    body: "Athletes record directly in the browser — no app, no account, no friction. Works on the iPhone they already have in their pocket.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "AP-Style Recaps",
    body: "350–500 word publication-ready stories with natural quote integration. Ready to post to your website, email list, or hand off to print.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Reference Aliases",
    body: "You define how to refer to each player beyond their name — 'the shortstop from Omaha' or 'the 24-year-old in his second season.' The AI rotates them for you.",
  },
  {
    icon: <Trophy className="h-5 w-5" />,
    title: "Multi-Sport Ready",
    body: "Baseball, basketball, football, soccer, hockey, lacrosse — any sport with a broadcast or game notes works out of the box.",
  },
];

const WHO = [
  "College Athletic Departments",
  "Minor League Teams",
  "Professional Clubs",
  "High School Athletics",
  "Sports Broadcasters & Media",
  "Motorsports & Niche Sports",
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-[#0b0b0b] text-white min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b]/90 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img
            src="/Recorder Reporter Official Logo.png"
            alt="Recorder Reporter"
            className="h-10 w-auto"
            style={{ mixBlendMode: "screen" }}
          />
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <a
              href="mailto:texasfreelancewriter@gmail.com?subject=Recorder Reporter Demo Request"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Request Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-6 relative overflow-hidden">
        {/* Hero background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1743003997025-dbe3e33ebca1?w=1920&q=80&auto=format&fit=crop')",
          }}
        />
        {/* Dark overlays — left-heavy so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-black/60" />

        <div className="max-w-6xl mx-auto relative">
          <div className="mb-8">
            <img
              src="/Recorder Reporter Official Logo.png"
              alt="Recorder Reporter"
              className="h-24 md:h-32 w-auto"
              style={{ mixBlendMode: "screen" }}
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Live with NASCAR · DriversHQ
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 max-w-4xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            FROM FINAL WHISTLE<br />
            <span className="text-blue-500">TO PUBLISHED STORY</span><br />
            IN MINUTES.
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            Recorder Reporter automates the post-game workflow — identifying star performers, generating personalized interview questions, collecting video responses on any device, and writing publication-ready recaps.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:texasfreelancewriter@gmail.com?subject=Recorder Reporter Demo Request"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-base font-semibold transition-colors"
            >
              Request a Demo
              <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white px-8 py-4 rounded-xl text-base font-medium transition-colors"
            >
              <Play className="h-4 w-4" />
              See How It Works
            </a>
          </div>

          {/* Workflow preview strip */}
          <div className="mt-16 flex flex-wrap gap-2">
            {["Broadcast Transcript", "Identify Big Moments", "Send Questions", "Athletes Respond", "AI Writes Story", "Publish Everywhere"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                  <span className="text-blue-500 font-black text-xs" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{i + 1}</span>
                  <span className="text-xs text-gray-300 font-medium whitespace-nowrap">{step}</span>
                </div>
                {i < 5 && <ChevronRight className="h-3 w-3 text-gray-600 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual Story Strip ────────────────────────────────────── */}
      <section className="bg-[#0b0b0b] px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600 text-[10px] uppercase tracking-[0.25em] mb-8">The process, in pictures</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Panel 1: The Broadcast */}
            <div className="relative aspect-[3/2] rounded-2xl overflow-hidden group cursor-default">
              <img
                src="https://images.unsplash.com/photo-1641135698530-8d919344c0e5?w=800&q=80&auto=format&fit=crop"
                alt="Sports cameraman with headphones covering a live sporting event"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
              <div className="absolute inset-0 bg-blue-950/20" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">Step 1</p>
                <p className="text-white text-xl font-extrabold leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>THE BROADCAST</p>
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">AI listens to the broadcast and pulls the story from the transcript in real time.</p>
              </div>
            </div>

            {/* Panel 2: The Interview */}
            <div className="relative aspect-[3/2] rounded-2xl overflow-hidden group cursor-default">
              <img
                src="https://images.unsplash.com/photo-1675190282312-b87810694d0d?w=800&q=80&auto=format&fit=crop"
                alt="Athlete surrounded by reporters and microphones at post-game press conference"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
              <div className="absolute inset-0 bg-blue-950/20" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">Steps 2–4</p>
                <p className="text-white text-xl font-extrabold leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>THE INTERVIEW</p>
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">Athletes get personalized questions and record video answers right on their phone.</p>
              </div>
            </div>

            {/* Panel 3: The Story */}
            <div className="relative aspect-[3/2] rounded-2xl overflow-hidden group cursor-default">
              <img
                src="https://images.unsplash.com/photo-1537944179915-400416a0733f?w=800&q=80&auto=format&fit=crop"
                alt="Phone screen showing a published sports story"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
              <div className="absolute inset-0 bg-blue-950/20" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">Steps 5–6</p>
                <p className="text-white text-xl font-extrabold leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>THE STORY</p>
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">AI writes the recap and publishes it everywhere — website, social, and beyond.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ───────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-5 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-gray-500 text-sm">
          <span className="font-medium text-gray-400">Trusted by</span>
          <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-blue-500" /> NASCAR · DriversHQ</span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-500 italic">College Athletics programs</span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-500 italic">Minor League Baseball</span>
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-3">The Workflow</p>
            <h2 className="text-4xl md:text-5xl font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              HOW IT WORKS
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl">
              Four steps. Your SID goes from the press box to published story faster than your players get to the locker room.
            </p>
          </div>

          {/* Desktop: horizontal flow */}
          <div className="hidden lg:flex items-start gap-0">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex items-start flex-1">
                <div className="flex flex-col items-center text-center flex-1 px-2">
                  {/* Icon circle */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-blue-600/10 border-2 border-blue-500/30 flex items-center justify-center text-blue-400">
                      {step.icon}
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {step.number}
                    </div>
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-2 leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.85rem" }}>
                    {step.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.body}</p>
                </div>
                {/* Arrow between steps */}
                {i < STEPS.length - 1 && (
                  <div className="flex items-start pt-8 shrink-0 px-1">
                    <ChevronRight className="h-5 w-5 text-blue-500/50" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: vertical list */}
          <div className="lg:hidden space-y-4">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-600/10 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 relative shrink-0">
                    {step.icon && <span className="scale-75">{step.icon}</span>}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {step.number}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div className="w-px h-full bg-blue-500/20 mt-2" />}
                </div>
                <div className="pb-6">
                  <h3 className="font-bold uppercase tracking-wide mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {step.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-3">Built for Sports Media</p>
            <h2 className="text-4xl md:text-5xl font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              EVERYTHING YOUR SID NEEDS
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:border-blue-500/20 transition-colors">
                <div className="w-9 h-9 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ──────────────────────────────────────────── */}
      <section id="who" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-3">Built for Every Level</p>
            <h2 className="text-4xl md:text-5xl font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              FROM HIGH SCHOOL TO<br />THE PROFESSIONAL LEVEL
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl">
              If your organization produces post-game coverage, Recorder Reporter fits your workflow — and your budget.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-16">
            {WHO.map((org) => (
              <span key={org} className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-4 py-2 rounded-full text-sm">
                <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                {org}
              </span>
            ))}
          </div>

          {/* Pain point callout */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/5 border border-blue-500/15 rounded-2xl p-10">
            <p className="text-2xl md:text-3xl font-bold leading-snug max-w-3xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              "AFTER THE FINAL BUZZER, YOUR SID HAS 20 MINUTES TO TRACK DOWN QUOTES, WRITE THE RECAP, AND POST IT BEFORE THE CROWD LEAVES."
            </p>
            <p className="text-gray-400 mt-4">
              Recorder Reporter turns that scramble into a system. Your athletes answer on their phone. The story writes itself.
            </p>
          </div>
        </div>
      </section>

      {/* ── Social Proof ──────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-3">Live in the Wild</p>
            <h2 className="text-4xl md:text-5xl font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              ALREADY PROVEN IN SPORTS
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-8">
              <Quote className="h-8 w-8 text-blue-500/40 mb-4" />
              <p className="text-lg text-gray-200 leading-relaxed mb-6">
                "The AI interview system captures the right stories right after the race — the kind of authentic content fans actually want to see. It's faster than any workflow we've had before."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                  DH
                </div>
                <div>
                  <p className="font-semibold text-sm">DriversHQ</p>
                  <p className="text-gray-500 text-xs">NASCAR Driver Platform · drivershq.app</p>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-6">By the numbers</p>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { stat: "< 5 min", label: "Transcript to interview questions" },
                    { stat: "0 apps", label: "Athletes need to download" },
                    { stat: "4 steps", label: "From broadcast to published recap" },
                    { stat: "Any sport", label: "Any level, any roster size" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-3xl font-black text-blue-400" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{item.stat}</p>
                      <p className="text-gray-500 text-xs mt-1 leading-tight">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-700/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            READY TO TRANSFORM<br />
            <span className="text-blue-500">YOUR POST-GAME WORKFLOW?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            We're onboarding sports organizations now. Get a personalized demo and see Recorder Reporter working with your team's actual content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:texasfreelancewriter@gmail.com?subject=Recorder Reporter Demo Request&body=Hi, I'd like to request a demo of Recorder Reporter for [my organization]."
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-xl text-base font-semibold transition-colors"
            >
              Request a Demo
              <ChevronRight className="h-4 w-4" />
            </a>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white px-8 py-4 rounded-xl text-base font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img
            src="/Recorder Reporter Official Logo.png"
            alt="Recorder Reporter"
            className="h-8 w-auto"
            style={{ mixBlendMode: "screen", opacity: 0.7 }}
          />
          <p className="text-gray-600 text-sm">© 2026 Recorder Reporter. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="mailto:texasfreelancewriter@gmail.com?subject=Recorder Reporter Demo Request" className="hover:text-white transition-colors">Contact</a>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
