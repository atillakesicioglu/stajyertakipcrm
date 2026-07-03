import { hexToHsl, contrastForegroundHsl } from "@/lib/color-utils";

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
  const vars: string[] = [];

  if (settings.primaryColor) {
    vars.push(`--primary: ${hexToHsl(settings.primaryColor)}`);
    vars.push(
      `--primary-foreground: ${contrastForegroundHsl(settings.primaryColor)}`
    );
    vars.push(`--ring: ${hexToHsl(settings.primaryColor)}`);
  }

  if (settings.successColor) {
    vars.push(`--success: ${hexToHsl(settings.successColor)}`);
  }

  if (settings.warningColor) {
    vars.push(`--warning: ${hexToHsl(settings.warningColor)}`);
  }

  if (settings.dangerColor) {
    vars.push(`--destructive: ${hexToHsl(settings.dangerColor)}`);
    vars.push(
      `--destructive-foreground: ${contrastForegroundHsl(settings.dangerColor)}`
    );
  }

  if (settings.infoColor) {
    vars.push(`--info: ${hexToHsl(settings.infoColor)}`);
  }

  if (settings.neutralColor) {
    vars.push(`--neutral: ${hexToHsl(settings.neutralColor)}`);
    vars.push(`--muted-foreground: ${hexToHsl(settings.neutralColor)}`);
  }

  if (vars.length === 0) return null;

  const css = `:root, .dark { ${vars.join("; ")}; }`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
