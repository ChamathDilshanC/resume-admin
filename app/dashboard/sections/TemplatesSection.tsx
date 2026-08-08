"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, SectionHeader } from "@/components/FormControls";
import { TemplateIcon, CheckCircleIcon } from "@/components/icons";
import type { ResumeData } from "@/lib/types";
import type { TemplateSummary } from "@/lib/github";
import { listTemplatesAction, previewTemplateAction } from "../actions";

// A4 at 96dpi is 794x1123; scale the real rendered page down to a thumbnail.
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PREVIEW_SCALE = 0.34;

export function TemplatesSection({
  activeTemplate,
  data,
  onSelect,
}: {
  activeTemplate: string;
  data: ResumeData;
  onSelect: (templateId: string) => void;
}) {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const listResult = await listTemplatesAction();
    if (!listResult.ok) {
      setError(listResult.error);
      setLoading(false);
      return;
    }
    setTemplates(listResult.templates);

    const results = await Promise.all(
      listResult.templates.map(async (t) => {
        const preview = await previewTemplateAction(t.id, data);
        return [t.id, preview.ok ? preview.html : ""] as const;
      })
    );
    setPreviews(Object.fromEntries(results));
    setLoading(false);
  }, [data]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <SectionHeader
        icon={TemplateIcon}
        color="teal"
        title="Templates"
        action={
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh previews"}
          </Button>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <p className="mb-5 text-sm text-gray-500">
        Pick the layout used for your resume PDF. The preview below is the real template
        rendered with your live resume data. Changes apply when you press
        &ldquo;Save &amp; Regenerate PDF&rdquo;. Add new templates by creating a folder under{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">resume-core/templates/</code>.
      </p>

      {loading && !templates && (
        <p className="text-sm text-gray-500">Loading templates…</p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {(templates || []).map((template) => {
          const isActive = template.id === activeTemplate;
          const html = previews[template.id];
          return (
            <div
              key={template.id}
              className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                isActive ? "border-teal-400 ring-2 ring-teal-200" : "border-gray-200"
              }`}
            >
              <div
                className="relative overflow-hidden border-b border-gray-100 bg-gray-50"
                style={{ height: PAGE_HEIGHT * PREVIEW_SCALE }}
              >
                {html ? (
                  <iframe
                    title={`${template.label} preview`}
                    srcDoc={html}
                    sandbox=""
                    className="pointer-events-none origin-top-left border-0 bg-white"
                    style={{
                      width: PAGE_WIDTH,
                      height: PAGE_HEIGHT,
                      transform: `scale(${PREVIEW_SCALE})`,
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    {loading ? "Rendering preview…" : "Preview unavailable"}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900">{template.label}</h3>
                  {isActive && (
                    <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-xs text-gray-500">{template.description}</p>
                )}
                <div className="mt-auto pt-2">
                  <Button
                    variant={isActive ? "secondary" : "primary"}
                    disabled={isActive || loading}
                    onClick={() => onSelect(template.id)}
                  >
                    {isActive ? "Current template" : "Use this template"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
