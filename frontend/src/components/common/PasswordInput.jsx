import { useState } from "react";

export default function PasswordInput({
  name = "password",
  value,
  onChange,
  placeholder = "",
  minLength,
  required = false,
  label = "كلمة المرور",
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="input-group">
      <span>{label}</span>

      <div className="password-field">
        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={name === "password" ? "current-password" : "new-password"}
        />

        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        >
          {visible ? "إخفاء" : "إظهار"}
        </button>
      </div>
    </label>
  );
}
