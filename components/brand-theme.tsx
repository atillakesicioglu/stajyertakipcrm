import { hexToHsl } from "@/lib/color-utils";

export function BrandTheme({
  settings,
}: {
  settings: {
    primaryColor: string | null;
    successColor: string | null;
    warningColor: string | null;
    dangerColor: string | null;
    infoColor: string | null;
    neutralColor: string | null;
  };
}) {
  const rules: string[] = [];

  if (settings.primaryColor) {
    rules.push(`--primary: ${hexToHsl(settings.primaryColor)};`);
  }
  if (settings.successColor) {
    rules.push(`--brand-success: ${hexToHsl(settings.successColor)};`);
  }
  if (settings.warningColor) {
    rules.push(`--brand-warning: ${hexToHsl(settings.warningColor)};`);
  }
  if (settings.dangerColor) {
    const hsl = hexToHsl(settings.dangerColor);
    rules.push(`--brand-danger: ${hsl};`);
    rules.push(`--destructive: ${hsl};`);
  }
  if (settings.infoColor) {
    rules.push(`--brand-info: ${hexToHsl(settings.infoColor)};`);
  }
  if (settings.neutralColor) {
    rules.push(`--brand-neutral: ${hexToHsl(settings.neutralColor)};`);
  }

  if (rules.length === 0) return null;

  const css = `:root, .dark { ${rules.join(" ")} }`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
