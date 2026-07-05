export default function CornerFrame() {
  return (
    <>
      <div className="absolute left-0 top-0 h-8 w-8 border-l-[1px] border-t-[1px] border-cyan-500/25" />

      <div className="absolute right-0 top-0 h-8 w-8 border-r-[1px] border-t-[1px] border-cyan-500/25" />

      <div className="absolute bottom-0 left-0 h-8 w-8 border-b-[1px] border-l-[1px] border-cyan-500/25" />

      <div className="absolute bottom-0 right-0 h-8 w-8 border-b-[1px] border-r-[1px] border-cyan-500/25" />
    </>
  );
}