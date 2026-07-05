interface HUDCornerProps {
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
}

export default function HUDCorner({
  position,
}: HUDCornerProps) {

  const styles = {
    "top-left":
      "top-0 left-0 border-t border-l",

    "top-right":
      "top-0 right-0 border-t border-r",

    "bottom-left":
      "bottom-0 left-0 border-b border-l",

    "bottom-right":
      "bottom-0 right-0 border-b border-r",
  };

  return (
    <div
      className={`
      absolute
      w-8
      h-8
      border-cyan-400
      ${styles[position]}
    `}
    />
  );
}