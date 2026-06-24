import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { elevation, shape } from "../theme/shape";

export function Fab({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        fab: {
          position: "absolute",
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: shape.lg,
          backgroundColor: colors.fab,
          alignItems: "center",
          justifyContent: "center",
          ...elevation.high,
          zIndex: 10,
        },
      }),
    [colors]
  );

  return (
    <Pressable style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <MaterialCommunityIcons name="plus" size={28} color={colors.onAccent} />
    </Pressable>
  );
}
