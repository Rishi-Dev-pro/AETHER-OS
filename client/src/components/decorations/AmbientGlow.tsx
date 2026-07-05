export default function AmbientGlow() {
  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[180px]" />

      <div className="pointer-events-none absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />
    </>
  );
}