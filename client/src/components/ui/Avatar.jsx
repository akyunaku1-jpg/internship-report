export default function Avatar({ src, alt = "avatar", size = "h-10 w-10" }) {
  return src ? (
    <img src={src} alt={alt} className={`${size} rounded-full object-cover`} />
  ) : (
    <div className={`${size} rounded-full bg-slate-200`} />
  );
}
