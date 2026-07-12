import { useState } from "react";

export default function PasswordInput({
  name = "password",
  value,
  onChange,
  placeholder = "",
  minLength,
  required = false,
  label = "كلمة المرور",
  autoComplete = "current-password",
}) {
  return (
    <label className="input-group">
      <span>{label}</span>
      <input
        type="password"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        autoComplete={autoComplete}
      />
    </label>
  );
}
