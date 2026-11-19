import { z } from "@/lib/validation";
// Keep the approved CSS values verbatim. Empty overrides have zero visual effect.
export const tokenNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "ink",
  "ink-foreground",
  "graphite",
  "sand",
  "stone",
  "glass-navigation",
  "glass-dock",
  "glass-menu",
  "glass-surface",
  "glass-light-border",
  "glass-dark-surface",
] as const;
const color = z
  .string()
  .regex(
    /^(#[0-9a-fA-F]{6}|oklch\((?:0|1|0?\.\d+) (?:0|0?\.\d+) \d{1,3}(?: \/ (?:0|1|0?\.\d+))?\))$/,
  );
export const themeSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  colors: z.partialRecord(z.enum(tokenNames), color),
  radius: z.number().min(0).max(3).optional(),
  contentWidth: z.number().min(960).max(1600).optional(),
  spacingScale: z.number().min(0.8).max(1.25).optional(),
  headingScale: z.number().min(0.8).max(1.25).optional(),
  bodyScale: z.number().min(0.9).max(1.2).optional(),
  glassBlur: z.number().min(0).max(40).optional(),
  fonts: z
    .object({
      sans: z.enum(["Inter", "system"]),
      display: z.enum(["Cormorant Garamond", "system"]),
      weights: z.array(z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)])),
    })
    .optional(),
  buttons: z
    .object({ radius: z.number().min(0).max(64), height: z.number().min(40).max(64) })
    .optional(),
  sectionColors: z
    .record(z.string().regex(/^[a-z0-9-]+$/), z.partialRecord(z.enum(tokenNames), color))
    .default({}),
});
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export const defaultTheme: ThemeSettings = {
  schemaVersion: 1,
  id: "rivton-approved",
  revision: 0,
  colors: {},
  sectionColors: {},
};
export function themeVariables(input: unknown): Record<string, string> {
  const theme = themeSettingsSchema.parse(input);
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors)) vars[`--${key}`] = value;
  if (theme.radius !== undefined) vars["--radius"] = `${theme.radius}rem`;
  if (theme.contentWidth !== undefined) vars["--rivton-content-width"] = `${theme.contentWidth}px`;
  if (theme.spacingScale !== undefined) vars["--spacing"] = `${0.25 * theme.spacingScale}rem`;
  if (theme.headingScale !== undefined) vars["--rivton-heading-scale"] = String(theme.headingScale);
  if (theme.bodyScale !== undefined) vars["--rivton-body-scale"] = String(theme.bodyScale);
  if (theme.glassBlur !== undefined) vars["--rivton-glass-blur"] = `${theme.glassBlur}px`;
  if (theme.fonts) {
    vars["--rivton-font-sans"] =
      theme.fonts.sans === "Inter"
        ? '"Inter", ui-sans-serif, system-ui, sans-serif'
        : "system-ui, sans-serif";
    vars["--rivton-font-display"] =
      theme.fonts.display === "Cormorant Garamond"
        ? '"Cormorant Garamond", ui-serif, Georgia, serif'
        : "Georgia, serif";
  }
  if (theme.buttons) {
    vars["--rivton-button-radius"] = `${theme.buttons.radius}px`;
    vars["--rivton-button-height"] = `${theme.buttons.height}px`;
  }
  return vars;
}
export function sectionVariables(theme: ThemeSettings, sectionId: string) {
  return themeVariables({ ...theme, colors: theme.sectionColors[sectionId] ?? {} });
}
