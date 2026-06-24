import { useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { shape } from "../../theme/shape";

type Props = {
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  trailing?: ReactNode;
};

export function ListTile({ title, subtitle, icon, onPress, trailing }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          gap: 16,
          borderRadius: shape.md,
          marginBottom: 4,
        },
        iconWrap: {
          width: 44,
          height: 44,
          borderRadius: shape.sm,
          backgroundColor: colors.accentContainer,
          alignItems: "center",
          justifyContent: "center",
        },
        body: { flex: 1 },
        title: { color: colors.text, fontSize: 16, fontWeight: "600" },
        subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
      }),
    [colors]
  );

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />}
    </Pressable>
  );
}
