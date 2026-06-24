import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { formatMoney } from "../utils/format";

type Slice = { value: number; color: string };

type Props = {
  data: Slice[];
  total: number;
  radius?: number;
  innerRadius?: number;
};

export function DonutChart({ data, total, radius = 90, innerRadius = 60 }: Props) {
  const slices = data.length ? data : [{ value: 1, color: colors.border }];
  const ringSize = radius * 2;
  const holeSize = innerRadius * 2;
  const ringColor = slices[0]?.color ?? colors.border;

  return (
    <View style={[styles.webWrap, { width: ringSize, height: ringSize }]}>
      <View
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: radius,
          backgroundColor: ringColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: holeSize,
            height: holeSize,
            borderRadius: innerRadius,
            backgroundColor: colors.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={styles.webCenter}>{formatMoney(total, true)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrap: { alignItems: "center", justifyContent: "center" },
  webCenter: { color: colors.text, fontWeight: "700", fontSize: 16, textAlign: "center" },
});
