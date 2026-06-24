import { Platform } from "react-native";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { useTheme } from "../contexts/ThemeContext";

export function NavToggle() {
  const { colors } = useTheme();
  if (Platform.OS === "web") return null;
  return <DrawerToggleButton tintColor={colors.text} />;
}
