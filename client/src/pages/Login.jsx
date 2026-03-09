import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import api from "../lib/axios";

const SAVED_ACCOUNTS_KEY = "savedLoginAccounts";

function getSavedAccounts() {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.email).slice(0, 5);
  } catch (_error) {
    return [];
  }
}

function saveAccountLoginOption(account) {
  const current = getSavedAccounts();
  const normalizedEmail = String(account.email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  const withoutDuplicate = current.filter((item) => String(item.email || "").toLowerCase() !== normalizedEmail);
  const next = [
    {
      email: normalizedEmail,
      name: String(account.name || "").trim(),
      lastUsedAt: new Date().toISOString(),
    },
    ...withoutDuplicate,
  ].slice(0, 5);

  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedEmail = form.email.trim().toLowerCase();
    const password = form.password;
    try {
      const response = await api.post("/api/auth/login", { email: trimmedEmail, password });
      const session = response.data?.session;

      if (!session?.access_token || !session?.refresh_token) {
        setError("Unable to login. Session was not returned.");
        return;
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (setSessionError) {
        setError(setSessionError.message || "Unable to finalize login session.");
        return;
      }

      saveAccountLoginOption({
        email: trimmedEmail,
        name: response.data?.user?.user_metadata?.name || trimmedEmail.split("@")[0],
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E7E9F5] p-4 md:p-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-[0_22px_56px_rgba(44,51,86,0.3)] md:grid-cols-[1.05fr_1fr]">
        <div className="bg-white p-8 md:p-14">
          <div className="mb-12 inline-flex items-center gap-2 text-[#3A3A3A]">
            <span className="h-3 w-3 rounded-full bg-gradient-to-b from-[#A855F7] to-[#6D28D9]" />
            <span className="text-xl font-semibold">System logo</span>
          </div>

          <h1 className="text-4xl font-semibold text-[#2C2F41]">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in by entering your account details</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {savedAccounts.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Saved Accounts</p>
                <div className="flex flex-wrap gap-2">
                  {savedAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, email: account.email }))}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      title={account.email}
                    >
                      {account.name || account.email}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="relative">
              <input
                type="email"
                className="w-full rounded-2xl border border-slate-200 bg-[#F7F8FF] px-4 py-3 pr-10 text-[#3B3D50]"
                placeholder="Username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <span className="pointer-events-none absolute right-4 top-3 text-slate-400">👤</span>
            </div>

            <div className="relative">
              <input
                type={show ? "text" : "password"}
                className="w-full rounded-2xl border border-slate-200 bg-[#F7F8FF] px-4 py-3 pr-20 text-[#3B3D50]"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" className="absolute right-4 top-3 text-sm font-medium text-slate-500 hover:text-slate-700" onClick={() => setShow((p) => !p)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="inline-flex items-center gap-2 text-slate-500">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Remember me
              </label>
              <Link to="#" className="font-medium text-slate-500 hover:text-[#6D28D9]">
                Forgot Password?
              </Link>
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-4 pt-2">
              <button disabled={loading} className="rounded-2xl bg-gradient-to-r from-[#3C70E6] to-[#2E62D5] px-10 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(60,112,230,0.32)] hover:from-[#3366da] hover:to-[#2757c5]">
                {loading ? "Loading..." : "Login"}
              </button>
              <Link to="/register" className="font-medium text-[#3D3F54] hover:text-[#6D28D9]">
                Sign up
              </Link>
            </div>
          </form>
        </div>

        <div className="relative hidden min-h-[640px] items-center justify-center overflow-hidden bg-[#F8FAFF] md:flex">
          <div className="relative mx-auto w-full max-w-xl px-8">
            <img
              src="/images/login-display-reference.png"
              alt="Checklist illustration"
              className="mx-auto w-full max-w-[540px] object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
