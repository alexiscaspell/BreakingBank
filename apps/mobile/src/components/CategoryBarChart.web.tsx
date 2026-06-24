import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { formatMoney } from "../utils/format";

type Bar = { value: number; label: string; frontColor: string };

type Props = {
  data: Bar[];
};

export function CategoryBarChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.webBars}>
      {data.map((d) => (
        <View key={d.label} style={styles.webRow}>
          <Text style={styles.webLabel}>{d.label}</Text>
          <View style={styles.webTrack}>
            <View
              style={[
                styles.webFill,
                { width: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: d.frontColor },
              ]}
            />
          </View>
          <Text style={styles.webValue}>{formatMoney(d.value, true)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  webBars: { width: "100%", gap: 10 },
  webRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  webLabel: { color: colors.textSecondary, width: 48, fontSize: 11 },
  webTrack: { flex: 1, height: 18, backgroundColor: colors.border, borderRadius: 6, overflow: "hidden" },
  webFill: { height: "100%", borderRadius: 6 },
  webValue: { color: colors.text, width: 72, fontSize: 11, textAlign: "right" },
});
