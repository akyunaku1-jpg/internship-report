import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/axios";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    const trimmedEmail = form.email.trim().toLowerCase();
    setMessage("");

    try {
      const response = await api.post("/api/auth/register", {
        name: form.name.trim(),
        email: trimmedEmail,
        password: form.password,
      });
      const session = response.data?.session;

      if (!session?.access_token || !session?.refresh_token) {
        setMessage("Account created. Please login from the sign-in page.");
        return;
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (setSessionError) {
        setError(setSessionError.message || "Account created, but session setup failed.");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to create account.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <input className="w-full rounded-lg border px-4 py-3" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="email" className="w-full rounded-lg border px-4 py-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" className="w-full rounded-lg border px-4 py-3" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input type="password" className="w-full rounded-lg border px-4 py-3" placeholder="Confirm Password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        <button className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white">Create Account</button>
        <p className="text-sm">
          Already have an account?{" "}
          <Link to="/" className="text-blue-600">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
