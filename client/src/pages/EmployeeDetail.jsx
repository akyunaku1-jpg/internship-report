import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";
import { formatDate } from "../utils/formatDate";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState({ employee: null, education: [], family: [], emergencyContacts: [] });

  useEffect(() => {
    api.get(`/api/employees/${id}`).then((res) => setDetail(res.data)).catch(() => null);
  }, [id]);

  if (!detail.employee) {
    return <PageWrapper title="Employee Detail">Loading...</PageWrapper>;
  }

  const e = detail.employee;
  return (
    <PageWrapper title="Employee Detail">
      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">HR System</p>
            <h2 className="text-2xl font-bold">{e.name}</h2>
            <p className="text-sm text-slate-500">{e.position || "Employee"}</p>
          </div>
          <Link to={`/employees/${id}/onboarding`} className="rounded-lg bg-blue-600 px-3 py-2 text-white">
            Onboarding
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Basic Information</h3>
            <p>Email: {e.email}</p>
            <p>Phone: {e.phone || "-"}</p>
            <p>Employee ID: {e.employee_id || "-"}</p>
            <p>Birth Date: {formatDate(e.birth_date)}</p>
            <p>Blood Type: {e.blood_type || "-"}</p>
            <p>Marital Status: {e.marital_status || "-"}</p>
            <p>Religion: {e.religion || "-"}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Address</h3>
            <p>{e.address || "-"}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Emergency Contact</h3>
            {detail.emergencyContacts.map((c) => (
              <p key={c.id}>
                {c.name} - {c.relationship} - {c.phone}
              </p>
            ))}
          </section>
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Education</h3>
            {detail.education.map((ed) => (
              <div key={ed.id} className="mb-2 rounded border p-2">
                <p className="font-medium">{ed.degree}</p>
                <p className="text-sm">{ed.major} - {ed.institution}</p>
              </div>
            ))}
          </section>
          <section className="rounded-lg border p-4 md:col-span-2">
            <h3 className="mb-3 font-semibold">Family</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th>Family Type</th>
                  <th>Person Name</th>
                </tr>
              </thead>
              <tbody>
                {detail.family.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="py-2">{f.family_type}</td>
                    <td>{f.person_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
