import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { useTheme } from "../contexts/ThemeContext";
import { formatMoney } from "../utils/format";

type Slice = { value: number; color: string };

type Props = {
  data: Slice[];
  total: number;
  radius?: number;
  innerRadius?: number;
};

export function DonutChart({ data, total, radius = 90, innerRadius = 60 }: Props) {
  const { colors } = useTheme();
  const slices = useMemo(() => {
    if (!data.length) return [{ value: 1, color: colors.border }];
    return data.map((slice) => ({
      value: slice.value,
      color: slice.color || colors.accent,
      strokeWidth: 2,
      strokeColor: colors.background,
    }));
  }, [data, colors.background, colors.border, colors.accent]);

  return (
    <PieChart
      key={slices.map((s) => `${s.color}-${s.value}`).join("|")}
      data={slices}
      donut
      radius={radius}
      innerRadius={innerRadius}
      isAnimated={false}
      showText={false}
      showValuesAsLabels={false}
      centerLabelComponent={() => <Text style={[styles.center, { color: colors.text }]}>{formatMoney(total, true)}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { fontWeight: "700", fontSize: 16 },
});
