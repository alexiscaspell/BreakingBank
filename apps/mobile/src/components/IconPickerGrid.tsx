import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { PresetIcon } from "../constants/presetIcons";
import { colors } from "../theme/colors";

type Props = {
  icons: PresetIcon[];
  selectedKey: string | null;
  onSelect: (icon: PresetIcon) => void;
  columns?: number;
};

export function IconPickerGrid({ icons, selectedKey, onSelect, columns = 5 }: Props) {
  const width = `${100 / columns}%` as `${number}%`;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
      {icons.map((icon) => {
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
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
