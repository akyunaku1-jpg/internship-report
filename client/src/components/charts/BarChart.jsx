import { ResponsiveContainer, BarChart as ReBarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export default function BarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ReBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="department" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
