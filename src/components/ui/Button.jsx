export default function Button({
  as: Comp = "button",
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}) {
  const variantClass = variant === "ghost" ? "ghost" : "primary";
  const nextClass = `${variantClass} ui-btn ${className}`.trim();
  return (
    <Comp type={Comp === "button" ? type : undefined} className={nextClass} {...props}>
      {children}
    </Comp>
  );
}
