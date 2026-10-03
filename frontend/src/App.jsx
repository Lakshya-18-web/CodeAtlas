import { useState,useEffect } from "react";
import "./App.css";
import {
   Sun,
  Moon,
  LayoutDashboard,
  Network,
  ShieldAlert,
  KeyRound,
  AlertTriangle,
  MessageSquare,
  Upload,
  FolderGit2,
  Loader2,
} from "lucide-react";

import CodeMap from "./CodeMap";
import RiskView from "./RiskView";
import AskCodebase from "./AskCodebase";

function App() {


  const [theme, setTheme] = useState(() => {
  return localStorage.getItem("codeatlas-theme") || "dark";
});

useEffect(() => {
  localStorage.setItem("codeatlas-theme", theme);
}, [theme]);
  const [activePage, setActivePage] = useState("Dashboard");

  const [stats, setStats] = useState({
    files: 0,
    nodes: 0,
    edges: 0,
    highRisk: 0,
    secrets: 0,
  });

  const [repository, setRepository] = useState(null);
  const [uploading, setUploading] = useState(false);
const [analysisStage, setAnalysisStage] = useState("");
  const [error, setError] = useState("");
  const [secretReport, setSecretReport] = useState(null);
  const [secretsAcknowledged, setSecretsAcknowledged] = useState(true);

  async function analyzeRepository(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Please upload a ZIP file.");
      return;
    }

    setUploading(true);
    setAnalysisStage("Uploading repository...");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Analysis failed");
      }

      // --------------------------------------------------------
      // Get ML risk results for the newly analyzed repository
      // --------------------------------------------------------

      let highRiskCount = 0;

      try {
        const riskResponse = await fetch("/api/risk");
        const riskData = await riskResponse.json();

        if (Array.isArray(riskData)) {
          highRiskCount = riskData.filter(
            (item) => item.risk_level === "High"
          ).length;
        }
      } catch (riskError) {
        console.error(
          "Could not load risk predictions:",
          riskError
        );
      }

      // --------------------------------------------------------
      // Update dashboard statistics
      // --------------------------------------------------------

      setStats({
        files: data.files,
        nodes: data.nodes,
        edges: data.edges,
        highRisk: highRiskCount,
        secrets: data.secrets?.total || 0,
      });

      setSecretReport(data.secrets || null);
      setSecretsAcknowledged(!(data.secrets?.total > 0));

      // This is the source of truth for the current
      // frontend session.
      setRepository(file.name);

      // Repositories containing possible secrets require an explicit choice.
      // Continuing uses the same upload and never changes its files.
      setActivePage(
        data.secrets?.total > 0 ? "Dashboard" : "Code Map"
      );
    } catch (err) {
      setError(
        err.message || "Analysis failed"
      );
    } finally {
      setUploading(false);
    }
  }

  const hasRepository = Boolean(repository);
  const canExplore = hasRepository && secretsAcknowledged;

  function openPage(page) {
    if (!hasRepository && page !== "Dashboard") {
      setActivePage("Dashboard");
      setError(
        "Analyze a repository before opening this view."
      );
      return;
    }

    if (!secretsAcknowledged && page !== "Dashboard") {
      setActivePage("Dashboard");
      setError("Review the detected secrets and choose whether to continue.");
      return;
    }

    setError("");
    setActivePage(page);
  }

  return (
    <div
  data-theme={theme}
  className="min-h-screen bg-[#09090b] text-white flex"
>

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0d0d0f] p-5 flex flex-col">

        <div className="flex items-center gap-3 mb-10">

          <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center font-bold">
            ◈
          </div>

          <div>
            <h1 className="font-semibold text-lg">
              CodeAtlas
            </h1>

            <p className="text-xs text-zinc-500">
              Code Intelligence
            </p>
          </div>

        </div>

        <div className="text-xs text-zinc-600 uppercase tracking-wider mb-3">
          Overview
        </div>

        <nav className="space-y-1">

          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={activePage === "Dashboard"}
            onClick={() => openPage("Dashboard")}
          />

          <NavItem
            icon={<Network size={18} />}
            label="Code Map"
            active={activePage === "Code Map"}
            disabled={!canExplore}
            onClick={() => openPage("Code Map")}
          />

          <NavItem
            icon={<ShieldAlert size={18} />}
            label="Risk View"
            active={activePage === "Risk View"}
            disabled={!canExplore}
            onClick={() => openPage("Risk View")}
          />

          <NavItem
            icon={<MessageSquare size={18} />}
            label="Ask Codebase"
            active={activePage === "Ask Codebase"}
            disabled={!canExplore}
            onClick={() => openPage("Ask Codebase")}
          />

        </nav>

        {/* Repository */}
        <div className="mt-auto">

          <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">

            <div className="flex items-center gap-2 mb-2">

              <FolderGit2
                size={16}
                className="text-zinc-400"
              />

              <span className="text-sm">
                Repository
              </span>

            </div>

            <p className="text-sm text-zinc-400 truncate">
              {repository || "No repository loaded"}
            </p>

            {repository && (
              <p className="text-xs text-zinc-600 mt-1">
                {stats.files} files analyzed
              </p>
            )}

          </div>

        </div>

      </aside>

      {/* Main */}
      <main className="flex-1">

        {activePage === "Dashboard" && (
          <Dashboard
            stats={stats}
            uploading={uploading}
            error={error}
            onAnalyze={analyzeRepository}
            onCodeMap={() => openPage("Code Map")}
            theme={theme}
            setTheme={setTheme}
            secretReport={secretReport}
            onContinue={() => {
              setSecretsAcknowledged(true);
              setError("");
              setActivePage("Code Map");
            }}
          />
        )}

        {activePage === "Code Map" && (
          <CodeMap repository={repository} />
        )}

        {activePage === "Risk View" && (
          <RiskView />
        )}

        {activePage === "Ask Codebase" && (
          <AskCodebase />
        )}

      </main>

    </div>
  );
}


function Dashboard({
  stats,
  uploading,
  error,
  onAnalyze,
  onCodeMap,
  theme,
  setTheme,
  secretReport,
  onContinue,
}) {
  return (
    <>
     <header className="h-16 border-b border-white/10 flex items-center justify-between px-8">

  <h2 className="font-medium">
    Dashboard
  </h2>

  <div className="flex items-center gap-3">

    {/* Theme Toggle */}
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>

    {/* Analyze Repository */}
    <label className="cursor-pointer">

      <input
        type="file"
        accept=".zip"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          onAnalyze(e.target.files[0]);
          e.target.value = "";
        }}
      />

      <span
       className={`flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition ${
          uploading
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-zinc-200"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Upload size={16} />
            Analyze Repository
          </>
        )}
      </span>

    </label>

  </div>

</header>

      <section className="p-8 max-w-7xl mx-auto">

        <div className="mb-8">

          <h1 className="text-3xl font-semibold tracking-tight">
            Codebase Overview
          </h1>

          <p className="text-zinc-500 mt-2">
            Understand your Python codebase, dependencies and risks.
          </p>

        </div>

        {error && (
          <div className="mb-5 border border-red-500/20 bg-red-500/5 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          <StatCard
            label="Files"
            value={stats.files}
          />

          <StatCard
            label="Nodes"
            value={stats.nodes}
          />

          <StatCard
            label="High Risk"
            value={stats.highRisk}
          />

          <StatCard
            label="Exposed Secrets"
            value={stats.secrets}
          />

        </div>

        {secretReport?.total > 0 && (
          <div className="mb-6 border border-amber-500/30 bg-amber-500/5 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex gap-3">
                <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={22} />
                <div>
                  <h3 className="font-medium text-amber-300">
                    {secretReport.total} possible secret{secretReport.total === 1 ? "" : "s"} detected
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Found in {secretReport.files_affected} file{secretReport.files_affected === 1 ? "" : "s"}. Values are masked and the repository was not modified.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(secretReport.by_type || {}).map(([type, count]) => (
                      <span key={type} className="text-xs px-2.5 py-1 rounded-full border border-amber-500/20 text-amber-300 bg-amber-500/10">
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={onContinue}
                className="shrink-0 px-4 py-2 rounded-lg bg-amber-400 text-black text-sm font-medium hover:bg-amber-300 transition"
              >
                Continue with same repo
              </button>
            </div>

            <div className="mt-4 max-h-48 overflow-auto border-t border-amber-500/15 pt-3 space-y-2">
              {secretReport.findings.map((finding, index) => (
                <div key={`${finding.file}-${finding.line}-${index}`} className="flex items-center gap-3 text-xs">
                  <KeyRound size={13} className="text-amber-400 shrink-0" />
                  <span className="text-zinc-300 truncate">{finding.file}:{finding.line}</span>
                  <span className="text-zinc-500">{finding.label}</span>
                  <code className="ml-auto text-amber-300/80">{finding.masked_value}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border border-white/10 rounded-2xl bg-[#0d0d0f] overflow-hidden">

          <div className="p-5 border-b border-white/10 flex items-center justify-between">

            <div>

              <h3 className="font-medium">
                Dependency Graph
              </h3>

              <p className="text-sm text-zinc-500 mt-1">
                Visualize relationships inside your codebase.
              </p>

            </div>

            <button
              onClick={onCodeMap}
              disabled={stats.files === 0}
              className={`text-sm ${
                stats.files === 0
                  ? "text-zinc-700 cursor-not-allowed"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Open Code Map →
            </button>

          </div>

          <div className="h-[420px] flex items-center justify-center">

            {stats.files === 0 ? (
              <div className="text-center">

                <Network
                  size={40}
                  className="text-zinc-600 mx-auto mb-4"
                />

                <h3 className="text-zinc-300 font-medium">
                  No repository analyzed
                </h3>

                <p className="text-zinc-600 text-sm mt-2">
                  Upload a Python repository to generate the graph.
                </p>

              </div>
            ) : (
              <div className="text-center">

                <Network
                  size={40}
                  className="text-zinc-400 mx-auto mb-4"
                />

                <h3 className="text-zinc-300 font-medium">
                  Repository analyzed
                </h3>

                <p className="text-zinc-500 text-sm mt-2">
                  {stats.files} files · {stats.nodes} nodes ·{" "}
                  {stats.edges} relationships
                </p>

                <button
                  onClick={onCodeMap}
                 className="mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  Explore Code Map
                </button>

              </div>
            )}

          </div>

        </div>

      </section>
    </>
  );
}


function NavItem({
  icon,
  label,
  active,
  onClick,
  disabled = false,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={
        disabled
          ? "Analyze a repository before opening this view"
          : undefined
      }
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
        disabled
          ? "text-zinc-700 cursor-not-allowed"
          : active
          ? "bg-white/10 text-white"
          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}


function StatCard({
  label,
  value,
}) {
  return (
    <div className="border border-white/10 rounded-xl bg-[#0d0d0f] p-5">

      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="text-2xl font-semibold mt-2">
        {value}
      </p>

    </div>
  );
}


export default App;
