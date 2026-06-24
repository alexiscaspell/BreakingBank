import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { PresetIcon } from "../constants/presetIcons";
import { colors } from "../theme/colors";

type Props = {
  icons: PresetIcon[];
  selectedKey: string | null;
  onSelect: (icon: PresetIcon) => void;
  columns?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function IconPickerGrid({
  icons,
  selectedKey,
  onSelect,
  columns = 5,
  searchable = false,
  searchPlaceholder = "Buscar icono…",
}: Props) {
  const [query, setQuery] = useState("");
  const width = `${100 / columns}%` as `${number}%`;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return icons;
    return icons.filter(
      (icon) => icon.label.toLowerCase().includes(q) || icon.key.toLowerCase().includes(q)
    );
  }, [icons, query, searchable]);

  return (
    <View>
      {searchable ? (
        <TextInput
          style={styles.search}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.inputPlaceholder}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Sin resultados</Text>
        ) : (
          filtered.map((icon) => {
            const active = selectedKey === icon.key;
            const bg = icon.color ?? colors.accent;
            return (
              <Pressable
                key={icon.key}
                style={[styles.item, { width }, active && styles.itemActive]}
                onPress={() => onSelect(icon)}
              >
                <View style={[styles.circle, { backgroundColor: bg }]}>
                  <MaterialCommunityIcons name={icon.icon} size={22} color="#fff" />
                </View>
                <Text style={styles.label} numberOfLines={2}>
                  {icon.label}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  scroll: { maxHeight: 280 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingBottom: 8 },
  item: { alignItems: "center", paddingVertical: 6, paddingHorizontal: 2 },
  itemActive: { backgroundColor: colors.card, borderRadius: 8 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: colors.textSecondary, fontSize: 9, textAlign: "center", marginTop: 4 },
  empty: { color: colors.textSecondary, textAlign: "center", padding: 16, width: "100%" },
});
