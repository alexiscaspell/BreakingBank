import { useMemo, type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { elevation } from "../../theme/shape";
import { shape } from "../../theme/shape";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "filled";
  radius?: number;
};

export function Surface({ children, style, variant = "elevated", radius = shape.md }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          backgroundColor: variant === "filled" ? colors.surfaceVariant : colors.surface,
          borderRadius: radius,
          borderWidth: variant === "default" ? 1 : 0,
          borderColor: colors.border,
          ...(variant === "elevated" ? elevation.low : elevation.none),
        },
      }),
    [colors, variant, radius]
  );
  return <View style={[styles.base, style]}>{children}</View>;
}
