export default function InputField({
  label,
  hint,
  error,
  className = "",
  inputClassName = "",
  id,
  ...inputProps
}) {
  const wrapperClass = `field ui-field ${className}`.trim();
  const nextInputClass = `${inputClassName} ${error ? "ui-input-error" : ""}`.trim();
  return (
    <label className={wrapperClass} htmlFor={id}>
      {label ? <span>{label}</span> : null}
      <input id={id} className={nextInputClass} {...inputProps} />
      {hint ? <small className="hint">{hint}</small> : null}
      {error ? <small className="error inline">{error}</small> : null}
    </label>
  );
}
