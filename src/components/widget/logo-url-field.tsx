"use client";

export function LogoUrlField({
  value,
  onChange,
  hint = "Shown in the widget header. Use your academy or site logo.",
}: {
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="span-two">
      Site logo
      <span className="logo-url-field">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- coach-hosted logo URL
          <img
            alt=""
            className="logo-thumb"
            key={value}
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
            src={value}
          />
        ) : (
          <span aria-hidden="true" className="logo-thumb logo-thumb-empty" />
        )}
        <input
          maxLength={500}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://yoursite.com/logo.png"
          type="url"
          value={value}
        />
      </span>
      <small className="field-hint">{hint}</small>
    </label>
  );
}
