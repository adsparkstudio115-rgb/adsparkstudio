"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setMessage("Signed in successfully. Opening your workspace…");
        router.replace("/campaigns");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) {
          setMessage("Account created. Opening your workspace…");
          router.replace("/campaigns"); router.refresh();
        } else {
          setMessage("Account created. Check your email to confirm your address, then sign in here.");
          setMode("signin");
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="auth-brand"><span>✦</span><b>AdSpark</b><small>LEADFLOW AI</small></Link>
    <span className="eyebrow">PRIVATE WORKSPACE</span>
    <h1>{mode === "signin" ? "Welcome back." : "Create your workspace account."}</h1>
    <p className="subcopy">Sign in to manage campaigns, research leads and create personalised demo previews.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label>
      <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="At least 6 characters"/></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <button className="primary-btn" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in →" : "Create account →"}</button>
    </form>
    <button type="button" className="auth-toggle" onClick={()=>{setMode(mode === "signin" ? "signup" : "signin");setError("");setMessage("");}}>
      {mode === "signin" ? "New to AdSpark? Create an account" : "Already have an account? Sign in"}
    </button>
    <Link href="/" className="back-link">← Back to dashboard</Link>
  </section></main>;
}
