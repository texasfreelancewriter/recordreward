import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Video, Upload, Copy, Check, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useOrg, useOrgs, setSelectedOrgId } from "@/hooks/useOrg";
import { getConfig, saveConfig, resetConfig, DEFAULT_CONFIG, TemplateConfig, SocialMediaConfig, fetchServerConfig, saveServerConfig } from "@/lib/template-config";

const BLUE = "#1a4f8a";
const BLUE_LIGHT = "#2563b0";
const WHITE = "#ffffff";

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.6)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#ffffff",
  width: "100%",
  borderRadius: "0.75rem",
  padding: "8px 12px",
  outline: "none",
  fontSize: "0.875rem",
};

const labelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  fontSize: "0.875rem",
  fontWeight: 500,
  display: "block",
  marginBottom: 4,
};

const sectionHeaderStyle: React.CSSProperties = {
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "1rem",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: 8,
  marginBottom: 16,
};

const ImageField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") onChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste URL or upload file →"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          title="Upload from device"
          style={{
            flexShrink: 0,
            padding: "8px 12px",
            borderRadius: "0.75rem",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          <Upload size={14} />
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          height: 80,
          borderRadius: "0.5rem",
          overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value ? (
          <img src={value} alt="preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>No image</span>
        )}
      </div>
    </div>
  );
};

const ImagePreview = ({ url }: { url: string }) => (
  <div
    style={{
      marginTop: 8,
      height: 80,
      borderRadius: "0.5rem",
      overflow: "hidden",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {url ? (
      <img src={url} alt="preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    ) : (
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>No image</span>
    )}
  </div>
);

const KioskPreview = ({ draft }: { draft: TemplateConfig }) => {
  const primaryBtn = draft.buttons.find((b) => b.id === "first_time");
  const secondaryBtn = draft.buttons.find((b) => b.id === "ace");

  return (
    <div
      style={{
        transform: "scale(0.75)",
        transformOrigin: "top center",
        width: "260px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        position: "relative",
      }}
    >
      {/* Background */}
      <div style={{ position: "absolute", inset: -9999, zIndex: 0 }}>
        {draft.backgroundImage && (
          <img
            src={draft.backgroundImage}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />
      </div>

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", marginBottom: -30 }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: "calc(58% + 6px)",
              background: "rgba(0,0,0,0.82)",
              borderRadius: "1rem",
              border: "1px solid rgba(255,255,255,0.4)",
            }}
          />
          {draft.logoImage ? (
            <img src={draft.logoImage} alt="logo" style={{ position: "relative", width: "100%", display: "block" }} />
          ) : (
            <div style={{ height: 60, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>No logo</span>
            </div>
          )}
        </div>
      </div>

      {/* Video placeholder */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          aspectRatio: "9/16",
          background: "rgba(0,0,0,0.82)",
          borderRadius: "1rem",
          border: "1px solid rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Video size={32} color="rgba(255,255,255,0.2)" />
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>Camera preview</span>
      </div>

      {/* Buttons */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", display: "flex", gap: 8, marginTop: 8 }}>
        <button
          style={{
            flex: 1,
            borderRadius: "0.75rem",
            padding: "12px 8px",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: WHITE,
            background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
            border: "2px solid rgba(255,255,255,0.5)",
            cursor: "default",
          }}
        >
          {primaryBtn?.label ?? "First Time"}
        </button>
        <button
          style={{
            flex: 1,
            borderRadius: "0.75rem",
            padding: "12px 8px",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: BLUE,
            background: WHITE,
            border: `2px solid ${BLUE}`,
            cursor: "default",
          }}
        >
          {secondaryBtn?.label ?? "Ace"}
        </button>
      </div>
    </div>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { data: org } = useOrg();
  const { data: orgs } = useOrgs();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const config = getConfig();

  const kioskUrl = org?.slug ? `${window.location.origin}/kiosk/${org.slug}` : null;

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function handleCopy() {
    if (!kioskUrl) return;
    navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const [draft, setDraft] = useState<TemplateConfig>({ ...config, rewardText: config.rewardText ?? "a reward" });

  function handleOrgSwitch(orgId: string) {
    setSelectedOrgId(orgId);
    queryClient.invalidateQueries({ queryKey: ["orgs"] });
    const newOrg = orgs?.find((o) => o.id === orgId);
    if (newOrg) {
      fetchServerConfig(newOrg.id).then((serverConfig) => {
        if (serverConfig) setDraft(serverConfig);
        else setDraft({ ...DEFAULT_CONFIG, rewardText: DEFAULT_CONFIG.rewardText ?? "a reward" });
      });
    }
  }

  useEffect(() => {
    if (!org?.id) return;
    fetchServerConfig(org.id).then((serverConfig) => {
      if (serverConfig) setDraft(serverConfig);
    });
  }, [org?.id]);

  const updateButton = (id: "first_time" | "ace", field: "label" | "questionText", value: string) => {
    setDraft((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    }));
  };

  const toggleButtonEnabled = (id: "first_time" | "ace") => {
    setDraft((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => (b.id === id ? { ...b, enabled: b.enabled === false ? true : false } : b)),
    }));
  };

  const handleSave = async () => {
    saveConfig(draft);
    await saveServerConfig(draft, org?.id);
    navigate("/dashboard?tab=settings");
  };

  const handleReset = () => {
    resetConfig();
    setDraft(DEFAULT_CONFIG);
  };

  const firstTimeBtn = draft.buttons.find((b) => b.id === "first_time") ?? draft.buttons[0];
  const aceBtn = draft.buttons.find((b) => b.id === "ace") ?? draft.buttons[1];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>
      {/* Mobile/desktop layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "100vh" }}>
        {/* Left panel — settings form */}
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            background: "#111",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
          className="md:w-80 md:max-w-[320px] md:flex-shrink-0"
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Link
              to="/"
              style={{
                color: "rgba(255,255,255,0.5)",
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 style={{ color: "#ffffff", fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>Kiosk Settings</h1>
          </div>

          {/* Form body */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 28, flex: 1 }}>
            {/* Business / Org switcher section */}
            {orgs && orgs.length > 0 ? (
              <section>
                <p style={sectionHeaderStyle}>Business</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {orgs.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleOrgSwitch(o.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "0.75rem",
                        background: (org?.id === o.id) ? "rgba(26,79,138,0.4)" : "rgba(255,255,255,0.05)",
                        border: (org?.id === o.id) ? "1px solid rgba(26,79,138,0.8)" : "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontWeight: (org?.id === o.id) ? 600 : 400,
                        fontSize: "0.875rem",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {o.name}
                    </button>
                  ))}
                  <Link
                    to="/setup"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "0.75rem",
                      background: "transparent",
                      border: "1px dashed rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      textAlign: "center",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "block",
                      transition: "all 0.15s",
                    }}
                  >
                    + Add New Business
                  </Link>
                </div>
              </section>
            ) : null}

            {/* Kiosk URL section */}
            {kioskUrl ? (
              <section>
                <p style={sectionHeaderStyle}>Your Kiosk URL</p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginBottom: 10 }}>
                  Share this link with customers so they can leave video feedback.
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "0.75rem",
                      padding: "8px 12px",
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.8)",
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                    }}
                  >
                    {kioskUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    title="Copy URL"
                    style={{
                      flexShrink: 0,
                      padding: "8px 12px",
                      borderRadius: "0.75rem",
                      background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                      border: copied ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.2)",
                      color: copied ? "#4ade80" : "rgba(255,255,255,0.7)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </section>
            ) : null}

            {/* Appearance section */}
            <section>
              <p style={sectionHeaderStyle}>Appearance</p>

              <ImageField
                label="Background Image"
                value={draft.backgroundImage}
                onChange={(val) => setDraft((prev) => ({ ...prev, backgroundImage: val }))}
              />
              <ImageField
                label="Logo Image"
                value={draft.logoImage}
                onChange={(val) => setDraft((prev) => ({ ...prev, logoImage: val }))}
              />

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Reward Text</label>
                <input
                  type="text"
                  value={draft.rewardText}
                  onChange={(e) => setDraft((prev) => ({ ...prev, rewardText: e.target.value }))}
                  placeholder="e.g. Free Appetizer, 10% Off, Free Dessert"
                  style={{ ...inputStyle, opacity: draft.rewardText ? 1 : 0.7 }}
                />
              </div>
            </section>

            {/* Buttons section */}
            <section>
              <p style={sectionHeaderStyle}>Buttons</p>

              <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    First Time button
                  </p>
                  <button
                    onClick={() => toggleButtonEnabled("first_time")}
                    title={firstTimeBtn.enabled === false ? "Enable button" : "Disable button"}
                    style={{
                      position: "relative",
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      border: "none",
                      cursor: "pointer",
                      background: firstTimeBtn.enabled === false ? "rgba(255,255,255,0.15)" : `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
                      transition: "background 0.2s",
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: firstTimeBtn.enabled === false ? 3 : 21,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#ffffff",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </div>
                <div>
                  <label style={labelStyle}>Button Label</label>
                  <input
                    type="text"
                    value={firstTimeBtn.label}
                    onChange={(e) => updateButton("first_time", "label", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prompt</label>
                  <textarea
                    value={firstTimeBtn.questionText}
                    onChange={(e) => updateButton("first_time", "questionText", e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Ace button
                  </p>
                  <button
                    onClick={() => toggleButtonEnabled("ace")}
                    title={aceBtn.enabled === false ? "Enable button" : "Disable button"}
                    style={{
                      position: "relative",
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      border: "none",
                      cursor: "pointer",
                      background: aceBtn.enabled === false ? "rgba(255,255,255,0.15)" : `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
                      transition: "background 0.2s",
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: aceBtn.enabled === false ? 3 : 21,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#ffffff",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </div>
                <div>
                  <label style={labelStyle}>Button Label</label>
                  <input
                    type="text"
                    value={aceBtn.label}
                    onChange={(e) => updateButton("ace", "label", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prompt</label>
                  <textarea
                    value={aceBtn.questionText}
                    onChange={(e) => updateButton("ace", "questionText", e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>
            </section>

            {/* Social Media section */}
            <section>
              <p style={sectionHeaderStyle}>Social Media</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginBottom: 16 }}>
                Enter your handles so staff can quickly navigate to your accounts when sharing clips.
              </p>
              {(["instagram", "twitter", "tiktok", "facebook", "youtube"] as (keyof SocialMediaConfig)[]).map((platform) => {
                const icons: Record<keyof SocialMediaConfig, string> = {
                  instagram: "📸",
                  twitter: "🐦",
                  tiktok: "🎵",
                  facebook: "👥",
                  youtube: "▶️",
                };
                const labels: Record<keyof SocialMediaConfig, string> = {
                  instagram: "Instagram",
                  twitter: "Twitter / X",
                  tiktok: "TikTok",
                  facebook: "Facebook",
                  youtube: "YouTube",
                };
                return (
                  <div key={platform} style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>{icons[platform]} {labels[platform]}</label>
                    <input
                      type="text"
                      value={draft.socialMedia?.[platform] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, [platform]: e.target.value },
                        }))
                      }
                      placeholder={`@your${platform}handle`}
                      style={inputStyle}
                    />
                  </div>
                );
              })}
            </section>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "0.75rem",
                  background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
              <button
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "0.75rem",
                  background: "transparent",
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  border: "1px solid rgba(255,255,255,0.25)",
                  cursor: "pointer",
                }}
              >
                Reset to Defaults
              </button>
            </div>

            {/* Sign Out */}
            <div style={{ paddingBottom: 8 }}>
              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "0.75rem",
                  background: "transparent",
                  color: "rgba(248,113,113,0.85)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  border: "1px solid rgba(248,113,113,0.25)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(248,113,113,0.08)";
                  e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)";
                }}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — live preview (desktop only) */}
        <div
          className="hidden md:flex"
          style={{
            flex: 1,
            background: "#0a0a0a",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "48px 24px",
            overflowY: "auto",
            position: "relative",
          }}
        >
          <div style={{ position: "sticky", top: 48 }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", textAlign: "center", marginBottom: 16, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Live Preview
            </p>
            <div
              style={{
                width: 260,
                minHeight: 560,
                background: "#0a0a0a",
                borderRadius: "1.5rem",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "24px 16px 16px",
              }}
            >
              {/* Preview background */}
              {draft.backgroundImage && (
                <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                  <img
                    src={draft.backgroundImage}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />
                </div>
              )}

              {/* Preview logo */}
              <div style={{ position: "relative", zIndex: 2, width: "100%", marginBottom: -20 }}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0,
                      height: "calc(58% + 6px)",
                      background: "rgba(0,0,0,0.82)",
                      borderRadius: "1rem",
                      border: "1px solid rgba(255,255,255,0.4)",
                    }}
                  />
                  {draft.logoImage ? (
                    <img src={draft.logoImage} alt="logo" style={{ position: "relative", width: "100%", display: "block" }} />
                  ) : (
                    <div
                      style={{
                        position: "relative",
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(255,255,255,0.2)",
                        fontSize: "0.7rem",
                      }}
                    >
                      No logo
                    </div>
                  )}
                </div>
              </div>

              {/* Preview video box */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  aspectRatio: "9/16",
                  background: "rgba(0,0,0,0.82)",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <Video size={28} color="rgba(255,255,255,0.2)" />
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.65rem" }}>Camera</span>
              </div>

              {/* Preview buttons */}
              <div style={{ position: "relative", zIndex: 2, width: "100%", display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  style={{
                    flex: 1,
                    borderRadius: "0.75rem",
                    padding: "10px 4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: WHITE,
                    background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_LIGHT} 100%)`,
                    border: "2px solid rgba(255,255,255,0.5)",
                    cursor: "default",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {draft.buttons.find((b) => b.id === "first_time")?.label ?? "First Time"}
                </button>
                <button
                  style={{
                    flex: 1,
                    borderRadius: "0.75rem",
                    padding: "10px 4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: BLUE,
                    background: WHITE,
                    border: `2px solid ${BLUE}`,
                    cursor: "default",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {draft.buttons.find((b) => b.id === "ace")?.label ?? "Ace"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
