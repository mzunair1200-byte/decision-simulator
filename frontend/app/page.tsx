"use client";
import { useState, useEffect, type FormEvent } from "react";

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Check if user is already "logged in" locally
  useEffect(() => {
    const savedUser = localStorage.getItem("decision_user");
    if (savedUser) setUser(savedUser);
  }, []);

  // Fetch history whenever the user state changes
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    localStorage.setItem("decision_user", emailInput);
    setUser(emailInput);
  };

  const logout = () => {
    localStorage.removeItem("decision_user");
    setUser(null);
    setHistory([]);
    setResult(null);
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      // CHANGED: Use relative path for Vercel
      const res = await fetch(`/api/history/${user}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const analyzeDecision = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      // CHANGED: Use relative path for Vercel
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, username: user }),
      });
      
      if (!response.ok) throw new Error("Analysis failed");
      
      const data = await response.json();
      setResult(data);
      fetchHistory(); // Refresh history list
    } catch (error) {
      alert("Error: Backend is not responding. Check if it is deployed correctly.");
    }
    setLoading(false);
  };

  // 1. LOGIN VIEW
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <form onSubmit={handleLogin} className="p-8 bg-slate-800 rounded-2xl shadow-xl w-full max-w-md space-y-4">
          <h1 className="text-3xl font-bold text-center mb-2">Decision Simulator</h1>
          <p className="text-slate-400 text-sm text-center">Enter a username to track your history</p>
          <input 
            type="text" 
            placeholder="Username or Email" 
            className="w-full p-4 rounded-xl bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500 text-white"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
          />
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all transform active:scale-95">
            Enter Dashboard
          </button>
        </form>
      </div>
    );
  }

  // 2. MAIN DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h2 className="font-black text-2xl text-slate-900">Decision Engine</h2>
            <p className="text-slate-500 text-sm">Analyze risks, simulate outcomes.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 uppercase font-bold">Logged in as</p>
              <p className="text-slate-800 font-medium">{user}</p>
            </div>
            <button onClick={logout} className="p-2 px-4 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition">
              Logout
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Input Section */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-2">What action are you considering?</label>
            <textarea
              className="w-full p-4 border border-slate-200 rounded-2xl h-32 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-slate-50 transition-all"
              placeholder="e.g. Should I invest in a professional coding bootcamp or self-learn?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={analyzeDecision}
              disabled={loading || !prompt}
              className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? "AI is simulating outcomes..." : "Run Decision Simulation"}
            </button>
          </div>

          {/* AI Result Section */}
          {result && (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-l-blue-600 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Risk Measurement</h3>
                  <p className="text-slate-500">Probability of failure/complexity</p>
                </div>
                <div className={`text-5xl font-black ${result.risk_percentage > 60 ? 'text-red-500' : 'text-green-500'}`}>
                  {result.risk_percentage}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <h4 className="font-black text-red-700 mb-2 uppercase text-xs tracking-widest">Worst Case</h4>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{result.worst_case}</p>
                </div>
                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                  <h4 className="font-black text-amber-700 mb-2 uppercase text-xs tracking-widest">Likely Outcome</h4>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{result.likely_case}</p>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <h4 className="font-black text-emerald-700 mb-2 uppercase text-xs tracking-widest">Healthy Growth</h4>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{result.healthy_outcome}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                   Strategic Suggestions
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl text-slate-700 text-sm">
                      <span className="bg-blue-600 text-white rounded-lg h-6 w-6 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xl font-bold text-slate-800">Recent History</h3>
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                  {history.length} Saved
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map((item) => (
                  <div key={item.id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.risk_percentage > 60 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {item.risk_percentage}% Risk
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-bold text-slate-800 line-clamp-2 text-sm group-hover:text-blue-600 transition-colors">
                      {item.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}