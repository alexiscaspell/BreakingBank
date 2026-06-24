import { useMemo } from "react";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: Platform.OS === "ios" ? 84 : 64,
      paddingBottom: Platform.OS === "ios" ? 24 : 8,
      paddingTop: 8,
      elevation: 8,
    }),
    [colors]
  );

  return (
    <Tabs
      key={locale}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t("nav.transactions"),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="swap-horizontal" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: t("nav.accounts"),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: t("nav.charts"),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-arc" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("nav.more"),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dots-grid" color={color} size={size} />,
        }}
      />
      {/* Hidden from tab bar — navigate via More hub */}
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="recurring" options={{ href: null }} />
      <Tabs.Screen name="reminders" options={{ href: null }} />
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="export-import" options={{ href: null }} />
    </Tabs>
  );
}
