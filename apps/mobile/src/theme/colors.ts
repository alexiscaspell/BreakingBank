export type ColorScheme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceVariant: string;
  header: string;
  card: string;
  accent: string;
  accentContainer: string;
  fab: string;
  text: string;
  textSecondary: string;
  border: string;
  danger: string;
  warning: string;
  onAccent: string;
  inputPlaceholder: string;
};

/** Material-inspired dark theme */
export const darkColors: ThemeColors = {
  background: "#0d1117",
  surface: "#161b22",
  surfaceVariant: "#21262d",
  header: "#161b22",
  card: "#21262d",
  accent: "#4ecdc4",
  accentContainer: "#1a3d38",
  fab: "#4ecdc4",
  text: "#f0f6fc",
  textSecondary: "#8b949e",
  border: "#30363d",
  danger: "#f85149",
  warning: "#d29922",
  onAccent: "#0d1117",
  inputPlaceholder: "#6e7681",
};

export const lightColors: ThemeColors = {
  background: "#f6f8fa",
  surface: "#ffffff",
  surfaceVariant: "#f0f3f6",
  header: "#ffffff",
  card: "#ffffff",
  accent: "#0969da",
  accentContainer: "#ddf4ff",
  fab: "#0969da",
  text: "#1f2328",
  textSecondary: "#656d76",
  border: "#d0d7de",
  danger: "#cf222e",
  warning: "#bf8700",
  onAccent: "#ffffff",
  inputPlaceholder: "#8c959f",
};

/** @deprecated use useTheme().colors */
export const colors = darkColors;

export function getColors(scheme: ColorScheme): ThemeColors {
  return scheme === "dark" ? darkColors : lightColors;
}
