import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocale } from "../contexts/LocaleContext";
import { useTheme } from "../contexts/ThemeContext";
import { shape } from "../theme/shape";

export function TypeTabs({
  value,
  onChange,
}: {
  value: "expense" | "income";
  onChange: (v: "expense" | "income") => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginHorizontal: 16, marginVertical: 8 },
        track: {
          flexDirection: "row",
          backgroundColor: colors.surfaceVariant,
          borderRadius: shape.md,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.border,
        },
        tab: {
          flex: 1,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: shape.sm,
        },
        tabActive: {
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 2,
          elevation: 2,
        },
        label: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
        labelActive: { color: colors.accent, fontWeight: "700" },
      }),
    [colors]
  );

  const items = [
    { key: "expense" as const, label: t("common.expenses") },
    { key: "income" as const, label: t("common.income") },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {items.map((item) => {
          const active = value === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onChange(item.key)}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
