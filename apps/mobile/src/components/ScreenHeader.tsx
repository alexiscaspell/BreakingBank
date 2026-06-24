import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export function ScreenHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          backgroundColor: colors.header,
          paddingTop: 48,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
        },
        title: { color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
      }),
    [colors]
  );

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}
