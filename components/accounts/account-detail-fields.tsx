import { useState, type ReactNode } from "react";

export function detailDate(value: string | null | undefined, withTime = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(value.length === 10
      ? { timeZone: "UTC" }
      : withTime
        ? { timeStyle: "short" }
        : {}),
  }).format(date);
}

export function DetailFields({
  fields,
}: {
  fields: ReadonlyArray<readonly [string, ReactNode]>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {fields.map(([label, value]) =>
        value === null || value === undefined || value === "" ? null : (
          <div key={label} className="contents">
            <dt className="text-bento-subtle">{label}</dt>
            <dd className="text-right font-medium wrap-break-word tabular-nums">
              {value}
            </dd>
          </div>
        )
      )}
    </dl>
  );
}

export function Metadata({ label, data }: { label: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  if (!data || typeof data !== "object" || !Object.keys(data).length)
    return null;
  return (
    <details
      className="mt-2 text-xs"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer rounded-sm text-bento-subtle hover:text-bento-default focus-visible:outline-ring">
        {label}
      </summary>
      {open && (
        <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-bento-raised p-3 wrap-break-word whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </details>
  );
}
