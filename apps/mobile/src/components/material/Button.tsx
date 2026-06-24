import { useMemo, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { shape } from "../../theme/shape";

type Variant = "filled" | "tonal" | "outlined" | "text";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "filled",
  disabled,
  loading,
  icon,
  style,
  fullWidth,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => {
    const bg =
      variant === "filled"
        ? colors.accent
        : variant === "tonal"
          ? colors.accentContainer
          : "transparent";
    const border = variant === "outlined" ? colors.border : "transparent";
    const textColor =
      variant === "filled" ? colors.onAccent : variant === "tonal" ? colors.accent : colors.accent;
    return StyleSheet.create({
      press: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: bg,
        borderWidth: variant === "outlined" ? 1.5 : 0,
        borderColor: border,
        borderRadius: shape.full,
        paddingVertical: 14,
        paddingHorizontal: 24,
        opacity: disabled ? 0.5 : 1,
        alignSelf: fullWidth ? "stretch" : "flex-start",
      },
      label: { color: textColor, fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
    });
  }, [colors, variant, disabled, fullWidth]);

  return (
    <Pressable
      style={({ pressed }) => [styles.press, pressed && { opacity: 0.85 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color={variant === "filled" ? colors.onAccent : colors.accent} /> : icon}
      {!loading ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}
