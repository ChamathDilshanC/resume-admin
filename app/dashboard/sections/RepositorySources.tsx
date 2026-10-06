"use client";

import type { RepositoryResearch } from "@/lib/repository-context.cjs";

export function RepositorySources({ research }: { research?: RepositoryResearch }) {
  if (!research) return null;
  return <details className="rounded-lg border border-gray-200 p-3 text-xs text-gray-600" open={research.warnings.length > 0}>
    <summary className="cursor-pointer font-semibold">
      README sources: {research.sources.length} read{research.warnings.length ? " (some sources incomplete)" : ""}
    </summary>
    <p className="mt-2">Fetched when this draft was generated. Review the source claims against your contribution.</p>
    <ul className="mt-2 space-y-1">
      {research.sources.map((s) => <li key={`${s.repository}:${s.ref}:${s.path}`}>
        <a className="break-all underline" href={s.url} target="_blank" rel="noreferrer">
          {s.repository}/{s.path}
        </a> ({s.ref.slice(0, 7)}){s.truncated ? " - shortened excerpt" : ""}
      </li>)}
    </ul>
    {research.warnings.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-amber-800">
      {research.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
    </ul>}
  </details>;
}
