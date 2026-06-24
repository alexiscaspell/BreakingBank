import { StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { colors } from "../theme/colors";

type Bar = { value: number; label: string; frontColor: string };

type Props = {
  data: Bar[];
};

export function CategoryBarChart({ data }: Props) {
  return (
    <BarChart
      data={data}
      barWidth={28}
      spacing={16}
      roundedTop
      roundedBottom
      hideRules
      xAxisThickness={0}
      yAxisThickness={0}
      yAxisTextStyle={{ color: colors.textSecondary }}
      xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
    />
  );
}
