import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
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
  const size = radius * 2;
  const cx = radius;
  const cy = radius;
  const strokeWidth = radius - innerRadius;
  const midRadius = innerRadius + strokeWidth / 2;
  const circumference = 2 * Math.PI * midRadius;

  const arcs = useMemo(() => {
    const slices = data.length ? data : [{ value: 1, color: colors.border }];
    const sum = slices.reduce((acc, s) => acc + s.value, 0);
    if (sum <= 0) return [];

    let offset = 0;
    return slices.map((slice, index) => {
      const length = (slice.value / sum) * circumference;
      const arc = {
        key: `${slice.color}-${index}`,
        color: slice.color || colors.accent,
        length,
        offset,
      };
      offset += length;
      return arc;
    });
  }, [circumference, colors.accent, colors.border, data]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {arcs.map((arc) => (
          <Circle
            key={arc.key}
            cx={cx}
            cy={cy}
            r={midRadius}
            stroke={arc.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            strokeDashoffset={-arc.offset}
            rotation={-90}
            origin={`${cx}, ${cy}`}
          />
        ))}
      </Svg>
      <View
        style={[
          styles.center,
          {
            width: innerRadius * 2,
            height: innerRadius * 2,
            borderRadius: innerRadius,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.centerText, { color: colors.text }]}>{formatMoney(total, true)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: { fontWeight: "700", fontSize: 16, textAlign: "center" },
});
