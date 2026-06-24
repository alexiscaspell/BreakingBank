import { StyleSheet, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
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

  return (
    <PieChart
      data={slices}
      donut
      radius={radius}
      innerRadius={innerRadius}
      centerLabelComponent={() => <Text style={styles.center}>{formatMoney(total, true)}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { color: colors.text, fontWeight: "700", fontSize: 16 },
});
