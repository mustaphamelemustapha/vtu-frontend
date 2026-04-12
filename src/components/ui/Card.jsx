export default function Card({ as: Comp = "div", className = "", children, ...props }) {
  const nextClass = `card ui-card ${className}`.trim();
  return (
    <Comp className={nextClass} {...props}>
      {children}
    </Comp>
  );
}
