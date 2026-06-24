import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { shape } from "../../theme/shape";

type Item<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  items: Item<T>[];
  value: T;
  onChange: (v: T) => void;
  scrollable?: boolean;
};

export function ChipGroup<T extends string>({ items, value, onChange, scrollable }: Props<T>) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        scroll: {
          flexGrow: 0,
        },
        scrollContent: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        chip: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          minHeight: 40,
          borderRadius: shape.full,
          backgroundColor: colors.surfaceVariant,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        chipSpacing: { marginRight: 8 },
        chipActive: {
          backgroundColor: colors.accentContainer,
          borderColor: colors.accent,
        },
        label: { color: colors.textSecondary, fontSize: 14, fontWeight: "500" },
        labelActive: { color: colors.accent, fontWeight: "700" },
      }),
    [colors]
  );

  const renderChip = (item: Item<T>, index: number, spaced: boolean) => {
    const active = value === item.key;
    return (
      <Pressable
        key={item.key}
        style={[
          styles.chip,
          spaced && index < items.length - 1 && styles.chipSpacing,
          active && styles.chipActive,
        ]}
        onPress={() => onChange(item.key)}
      >
        <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
      </Pressable>
    );
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item, index) => renderChip(item, index, true))}
      </ScrollView>
    );
  }

  return <View style={styles.row}>{items.map((item, index) => renderChip(item, index, false))}</View>;
}
