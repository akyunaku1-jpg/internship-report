import { useEffect, useState } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const { profile, user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("my-profile");
  const [form, setForm] = useState({});
  const [initialForm, setInitialForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [securityEmail, setSecurityEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const sections = [
    { id: "my-profile", label: "My Profile" },
    { id: "security", label: "Security" },
    { id: "delete-account", label: "Delete Account" },
  ];

  useEffect(() => {
    api
      .get("/api/profile")
      .then((res) => {
        const nextForm = res.data.profile || {};
        setForm(nextForm);
        setInitialForm(nextForm);
        setSecurityEmail(String(nextForm.email || ""));
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    api
      .get("/api/settings")
      .then((res) => {
        const map = Object.fromEntries((res.data.settings || []).map((item) => [item.key, item.value]));
        setTwoFactorEnabled(map.security_two_factor_enabled === "true");
      })
      .catch(() => null);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/profile", form);
      setInitialForm(form);
      setIsEditing(false);
      alert("✓ Profile updated successfully.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      alert("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File upload failed. Maximum size is 5MB.");
      return;
    }

    const toDataUrl = () =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });

    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);

    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((p) => ({ ...p, avatar_url: data.publicUrl }));
      alert("Photo uploaded successfully. Click Save Changes to apply.");
      return;
    }

    // Fallback: store image directly in profile when storage bucket/policy is not ready.
    try {
      const dataUrl = await toDataUrl();
      if (!dataUrl) throw new Error("Invalid image data.");
      setForm((p) => ({ ...p, avatar_url: dataUrl }));
      alert("Photo attached successfully. Click Save Changes to apply.");
    } catch (_fallbackError) {
      alert(error.message || "File upload failed. Please try another image.");
    }
  };

  const clearSecurityFeedback = () => {
    setSecurityError("");
    setSecurityMessage("");
  };

  const saveTwoFactor = async (nextValue) => {
    clearSecurityFeedback();
    setSecurityLoading(true);
    try {
      await api.put("/api/settings", {
        settings: [{ key: "security_two_factor_enabled", value: String(nextValue) }],
      });
      setTwoFactorEnabled(nextValue);
      setSecurityMessage(nextValue ? "2-step verification enabled." : "2-step verification disabled.");
    } catch (_error) {
      setSecurityError("Unable to update 2-step verification.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const updateEmail = async () => {
    clearSecurityFeedback();
    const nextEmail = securityEmail.trim().toLowerCase();
    if (!nextEmail) {
      setSecurityError("Email address is required.");
      return;
    }
    setSecurityLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) {
        setSecurityError(error.message || "Unable to update email.");
        return;
      }
      setForm((prev) => ({ ...prev, email: nextEmail }));
      setSecurityMessage("Email update requested. Check your inbox to confirm.");
      setShowEmailForm(false);
    } catch (_error) {
      setSecurityError("Unable to update email.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const updatePassword = async () => {
    clearSecurityFeedback();
    if (newPassword.length < 8) {
      setSecurityError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Password confirmation does not match.");
      return;
    }
    setSecurityLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setSecurityError(error.message || "Unable to update password.");
        return;
      }
      setSecurityMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (_error) {
      setSecurityError("Unable to update password.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const deactivateCurrentSession = async () => {
    const agreed = window.confirm("Sign out from this session now?");
    if (!agreed) return;
    await signOut();
    window.location.assign("/");
  };

  const deleteAccount = async () => {
    const confirmation = window.prompt("Type DELETE to permanently remove your account.");
    if (confirmation !== "DELETE") return;
    clearSecurityFeedback();
    setDeletingAccount(true);
    try {
      await api.post("/api/auth/delete-account");
      await signOut();
      window.location.assign("/");
    } catch (error) {
      setSecurityError(error?.response?.data?.error || "Unable to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const firstName = String(form.name || "").split(" ").slice(0, 1).join(" ");
  const lastName = String(form.name || "").split(" ").slice(1).join(" ");
  const isEmailVerified = Boolean(user?.email_confirmed_at);

  return (
    <PageWrapper title="Account Settings">
      <div className="rounded-xl bg-[#F4F7FB] p-4 md:p-6">
        <div className="card border border-[#E5EAF2] p-4 md:p-6">
          <h2 className="mb-4 text-xl font-semibold text-[#2A2A2A]">Account Settings</h2>
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <aside className="rounded-xl border border-[#E5EAF2] bg-[#FAFCFF] p-3">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      activeSection === section.id ? "bg-[#EAF1FF] font-semibold text-[#2A2A2A]" : section.id === "delete-account" ? "text-red-500" : "text-slate-600"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </aside>

            <section className="rounded-xl border border-[#E5EAF2] bg-white p-4 md:p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[#2A2A2A]">{sections.find((s) => s.id === activeSection)?.label || "My Profile"}</h3>
                {activeSection === "my-profile" && !isEditing ? (
                  <button type="button" onClick={() => setIsEditing(true)} className="rounded-lg border border-[#E5EAF2] px-3 py-1.5 text-sm hover:bg-slate-50">
                    Edit
                  </button>
                ) : null}
              </div>

              {activeSection !== "my-profile" && activeSection !== "security" ? (
                <div className="rounded-lg border border-dashed border-[#E5EAF2] p-10 text-center text-sm text-slate-500">
                  {sections.find((s) => s.id === activeSection)?.label} settings will be available soon.
                </div>
              ) : null}

              {activeSection === "security" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#E5EAF2]">
                    <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F7] px-4 py-3">
                      <div>
                        <p className="font-medium text-[#2A2A2A]">Email address</p>
                        <p className="text-sm text-slate-500">The email associated with your account.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmailForm((prev) => !prev)}
                        className="rounded-lg border border-[#E5EAF2] px-3 py-1.5 text-sm hover:bg-slate-50"
                      >
                        {showEmailForm ? "Close" : "Edit"}
                      </button>
                    </div>
                    <div className="space-y-2 px-4 py-3 text-sm">
                      <p className="break-all font-medium text-[#2A2A2A]">{form.email || user?.email || "-"}</p>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          isEmailVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isEmailVerified ? "Verified" : "Unverified"}
                      </span>
                      {showEmailForm ? (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="w-full max-w-sm text-sm">
                            New Email
                            <input
                              type="email"
                              value={securityEmail}
                              onChange={(event) => setSecurityEmail(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                              placeholder="your@email.com"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={updateEmail}
                            disabled={securityLoading}
                            className="rounded-lg bg-[#5B8DEF] px-3 py-2 text-sm font-medium text-white hover:bg-[#4a7de3] disabled:opacity-70"
                          >
                            Update Email
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E5EAF2]">
                    <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F7] px-4 py-3">
                      <div>
                        <p className="font-medium text-[#2A2A2A]">Password</p>
                        <p className="text-sm text-slate-500">Set a strong password to protect your account.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPasswordForm((prev) => !prev)}
                        className="rounded-lg border border-[#E5EAF2] px-3 py-1.5 text-sm hover:bg-slate-50"
                      >
                        {showPasswordForm ? "Close" : "Change Password"}
                      </button>
                    </div>
                    {showPasswordForm ? (
                      <div className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_1fr_auto]">
                        <label className="text-sm">
                          New Password
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                          />
                        </label>
                        <label className="text-sm">
                          Confirm Password
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={updatePassword}
                          disabled={securityLoading}
                          className="h-fit self-end rounded-lg bg-[#5B8DEF] px-3 py-2 text-sm font-medium text-white hover:bg-[#4a7de3] disabled:opacity-70"
                        >
                          Save
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#E5EAF2] px-4 py-3">
                    <div>
                      <p className="font-medium text-[#2A2A2A]">2-step verification</p>
                      <p className="text-sm text-slate-500">Add extra account security with a verification step.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={twoFactorEnabled}
                      onClick={() => saveTwoFactor(!twoFactorEnabled)}
                      disabled={securityLoading}
                      className={`relative h-7 w-12 rounded-full transition ${
                        twoFactorEnabled ? "bg-[#5B8DEF]" : "bg-slate-300"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                          twoFactorEnabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#E5EAF2] px-4 py-3">
                    <div>
                      <p className="font-medium text-[#2A2A2A]">Restricted members</p>
                      <p className="text-sm text-slate-500">Users you blocked from interacting with your account.</p>
                    </div>
                    <p className="text-sm font-medium text-slate-500">None</p>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#E5EAF2] px-4 py-3">
                    <div>
                      <p className="font-medium text-[#2A2A2A]">Deactivate my session</p>
                      <p className="text-sm text-slate-500">Sign out from this device and require login again.</p>
                    </div>
                    <button
                      type="button"
                      onClick={deactivateCurrentSession}
                      className="rounded-lg border border-[#E5EAF2] px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Deactivate
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
                    <div>
                      <p className="font-medium text-red-600">Delete account</p>
                      <p className="text-sm text-red-500">Permanently remove your account and profile data.</p>
                    </div>
                    <button
                      type="button"
                      onClick={deleteAccount}
                      disabled={deletingAccount}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 disabled:opacity-70"
                    >
                      {deletingAccount ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  {securityError ? <p className="text-sm text-red-600">{securityError}</p> : null}
                  {securityMessage ? <p className="text-sm text-green-600">{securityMessage}</p> : null}
                </div>
              ) : null}

              {activeSection === "my-profile" && !isEditing ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5EAF2] p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={form.avatar_url || "https://ui-avatars.com/api/?background=EAF1FF&color=2A2A2A&name=User"}
                        alt={form.name || "User"}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold">{form.name || profile?.name || "User"}</p>
                        <p className="text-sm text-slate-500">{form.position || "Internship Member"}</p>
                        <p className="text-xs text-slate-400">{form.address || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E5EAF2] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-semibold text-[#2A2A2A]">Personal Information</h4>
                      <button type="button" onClick={() => setIsEditing(true)} className="rounded-lg border border-[#E5EAF2] px-3 py-1 text-xs hover:bg-slate-50">
                        Edit
                      </button>
                    </div>
                    <div className="grid gap-4 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-slate-500">First Name</p>
                        <p className="font-medium">{firstName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Last Name</p>
                        <p className="font-medium">{lastName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Email Address</p>
                        <p className="font-medium">{form.email || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Phone</p>
                        <p className="font-medium">{form.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Department</p>
                        <p className="font-medium">{form.department || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Position</p>
                        <p className="font-medium">{form.position || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E5EAF2] p-4">
                    <h4 className="mb-3 font-semibold text-[#2A2A2A]">Address</h4>
                    <p className="text-sm text-slate-600">{form.address || "-"}</p>
                  </div>
                </div>
              ) : null}

              {activeSection === "my-profile" && isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      Full Name
                      <input
                        className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                        value={form.name || ""}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Email Address
                      <input
                        className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                        value={form.email || ""}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Phone
                      <input
                        className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                        value={form.phone || ""}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Department
                      <input
                        className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                        value={form.department || ""}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Position
                      <input
                        className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                        value={form.position || ""}
                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="block text-sm">
                    Address
                    <textarea
                      className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                      rows={3}
                      value={form.address || ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </label>

                  <label className="block rounded-lg border-2 border-dashed border-[#E5EAF2] p-5 text-center text-sm text-slate-600">
                    Upload Profile Photo
                    <input type="file" accept="image/*" className="mt-2 block w-full text-xs" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  </label>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForm(initialForm);
                        setIsEditing(false);
                      }}
                      className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700"
                    >
                      Cancel
                    </button>
                    <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-[#5B8DEF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a7de3] disabled:opacity-70">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
