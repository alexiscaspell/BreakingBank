import { useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { elevation } from "../../theme/shape";

type Props = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  large?: boolean;
  showBack?: boolean;
};

export function AppBar({ title, subtitle, trailing, large, showBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          backgroundColor: colors.header,
          paddingTop: insets.top + 8,
          paddingBottom: large ? 20 : 12,
          paddingHorizontal: 20,
          ...elevation.low,
        },
        row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
        backBtn: { padding: 4, marginRight: 4 },
        titleBlock: { flex: 1 },
        title: {
          color: colors.text,
          fontSize: large ? 28 : 22,
          fontWeight: "700",
          letterSpacing: -0.3,
        },
        subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
      }),
    [colors, insets.top, large]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {trailing}
      </View>
    </View>
  );
}
