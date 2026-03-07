export default function Button({ className = "", variant = "primary", ...props }) {
  const base = "rounded-xl px-4 py-2 text-sm font-medium transition duration-200";
  const variants = {
    primary: "bg-[#3A6FE2] text-white shadow-sm hover:bg-[#2f5fca]",
    secondary: "border border-[#DFE7F6] bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-300 text-red-600 hover:bg-red-50",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
