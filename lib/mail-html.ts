import { getAppUrl } from "@/lib/app-url";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildMailHtml({
  title,
  description,
  details,
  linkPath = "/isler",
  linkLabel = "Panele git",
}: {
  title: string;
  description: string;
  details?: { label: string; value: string }[];
  linkPath?: string;
  linkLabel?: string;
}) {
  const appUrl = getAppUrl();
  const detailRows =
    details
      ?.map(
        (d) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">${escapeHtml(d.label)}</td><td style="padding:4px 0;">${escapeHtml(d.value)}</td></tr>`
      )
      .join("") ?? "";

  const detailsBlock = detailRows
    ? `<table style="margin:16px 0;font-size:14px;">${detailRows}</table>`
    : "";

  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;">
  <h2 style="margin:0 0 12px;font-size:20px;">${escapeHtml(title)}</h2>
  <p style="margin:0 0 8px;">${escapeHtml(description)}</p>
  ${detailsBlock}
  <p style="margin:20px 0 0;">
    <a href="${escapeHtml(`${appUrl}${linkPath}`)}" style="color:#1e3a5f;">${escapeHtml(linkLabel)}</a>
  </p>
</div>`;
}
