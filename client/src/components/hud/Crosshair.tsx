export default function Crosshair() {
  return (
    <>
      <div className="absolute left-1/2 top-1/2 h-16 w-[0.5px] -translate-x-1/2 -translate-y-1/2 bg-cyan-500/10" />

      <div className="absolute left-1/2 top-1/2 h-[0.5px] w-16 -translate-x-1/2 -translate-y-1/2 bg-cyan-500/10" />

      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/20" />
    </>
  );
}