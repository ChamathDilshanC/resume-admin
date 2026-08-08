import Handlebars from "handlebars";
import type { ResumeData } from "./types";

// Keep in sync with the helpers registered in resume-core/generate-pdf.js so
// the admin preview renders identically to the generated PDF.

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateString(value: unknown): string {
  const trimmed = String(value || "").trim();
  const fullDate = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fullDate) {
    const monthIndex = Number(fullDate[2]) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${fullDate[1]}`;
    }
  }
  const monthYear = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (monthYear) {
    const monthIndex = Number(monthYear[2]) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${monthYear[1]}`;
    }
  }
  return trimmed;
}

Handlebars.registerHelper("joinList", function (list: unknown) {
  if (!Array.isArray(list)) return "";
  return list.join(", ");
});

Handlebars.registerHelper("dateRange", function (startDate: unknown, endDate: unknown) {
  const start = formatDateString(startDate);
  const end = formatDateString(endDate);
  if (!start && !end) return "";
  if (start && end) return `${start} - ${end}`;
  return start || end;
});

Handlebars.registerHelper("stripProtocol", function (url: unknown) {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
});

Handlebars.registerHelper("gt", function (a: unknown, b: unknown) {
  return Number(a) > Number(b);
});

export function renderTemplatePreview(
  templateHtml: string,
  stylesCss: string,
  data: ResumeData
): string {
  const template = Handlebars.compile(templateHtml);
  return template(data).replace(
    /<!--\s*INLINE_STYLES\s*-->/,
    () => `<style>${stylesCss}</style>`
  );
}
