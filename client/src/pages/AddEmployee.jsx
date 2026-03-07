import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";
import { supabase } from "../lib/supabase";

const initial = {
  name: "",
  notes: "",
  status: "active",
  department: "",
  position: "",
  join_date: "",
  employee_id: "",
  phone: "",
};

export default function AddEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(id);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/employees/${id}`).then((res) => setForm({ ...initial, ...res.data.employee })).catch(() => null);
  }, [id]);

  const uploadAvatar = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File upload failed. Maximum size is 5MB.");
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) {
      alert("File upload failed. Maximum size is 5MB.");
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setPreview(data.publicUrl);
    setForm((p) => ({ ...p, avatar_url: data.publicUrl }));
  };

  const save = async () => {
    setSaving(true);
    if (isEdit) await api.put(`/api/employees/${id}`, form);
    else await api.post("/api/employees", form);
    setSaving(false);
    navigate("/employees");
  };

  return (
    <PageWrapper title={isEdit ? "Edit Employee" : "Add Employee"}>
      <div className="mb-4 flex gap-2 text-sm">
        {["General", "Pricing", "Files", "Settings"].map((tab, i) => (
          <span key={tab} className={`rounded-full px-3 py-1 ${i === 0 ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700"}`}>
            {tab}
          </span>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-4 lg:col-span-2">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Employee" : "Add Employee"}</h3>
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Employee Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="w-full rounded-lg border px-3 py-2" placeholder="Employee bio/notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <label className="block rounded-lg border border-dashed p-6 text-center">
            Drop your images here, or Click to browse
            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
          {(preview || form.avatar_url) && <img src={preview || form.avatar_url} alt="preview" className="h-24 w-24 rounded-lg object-cover" />}
        </div>
        <div className="card space-y-3 p-4">
          <select className="w-full rounded-lg border px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on leave">On Leave</option>
          </select>
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Position/Role" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <input type="date" className="w-full rounded-lg border px-3 py-2" value={form.join_date?.slice(0, 10)} onChange={(e) => setForm({ ...form, join_date: e.target.value })} />
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Link to="/employees" className="rounded-lg border px-4 py-2">
          Save a draft
        </Link>
        <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">
          {saving ? "Saving..." : "Next Step"}
        </button>
      </div>
    </PageWrapper>
  );
}
