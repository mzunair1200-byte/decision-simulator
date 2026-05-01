"use client";
import React, { useState, useEffect } from "react";

// Defining the shape of our result to satisfy TypeScript
interface SimulationResult {
  risk_percentage: number;
  worst_case: string;
  likely_case: string;
  healthy_outcome: string;
  suggestions: string[];
}

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem("decision_user");
    if (savedUser) setUser(savedUser);
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
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
    if (!prompt.trim() || !user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, username: user }),
      });
      
      if (!response.ok) throw new Error("Analysis failed");
      
      const data = await response.json();
      setResult(data);
      fetchHistory(); 
    } catch (error) {
      alert("Error: Backend is not responding. Ensure your Database and API keys are set in Vercel.");
    }
    setLoading(false);
  };

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
          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all">
            Enter Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h2 className="font-black text-2xl">Decision Engine</h2>
            <p className="text-slate-500 text-sm italic">User: {user}</p>
          </div>
          <button onClick={logout} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100">
            Logout
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <textarea
              className="w-full p-4 border border-slate-200 rounded-2xl h-32 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
              placeholder="e.g. Should I start a business?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={analyzeDecision}
              disabled={loading || !prompt}
              className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-bold disabled:opacity-50"
            >
              {loading ? "Simulating..." : "Analyze Risk"}
            </button>
          </div>

          {result && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-l-blue-600 flex justify-between items-center">
                <h3 className="text-lg font-bold">Risk Level</h3>
                <div className="text-4xl font-black text-blue-600">{result.risk_percentage}%</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-sm">
                  <span className="font-bold text-red-700">Worst:</span> {result.worst_case}
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm">
                  <span className="font-bold text-amber-700">Likely:</span> {result.likely_case}
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm">
                  <span className="font-bold text-emerald-700">Healthy:</span> {result.healthy_outcome}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border">
                <h4 className="font-bold mb-2">Suggestions:</h4>
                <ul className="list-disc pl-5 space-y-1">
                   {result.suggestions.map((s, i) => <li key={i} className="text-sm">{s}</li>)}
                </ul>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-8">
              <h3 className="font-bold mb-4">Previous Searches</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map((h) => (
                  <div key={h.id} className="p-4 bg-white border rounded-xl flex justify-between items-center">
                    <span className="truncate text-sm font-medium">{h.prompt}</span>
                    <span className="text-blue-600 font-bold">{h.risk_percentage}%</span>
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