import { useMemo } from "react";
import { usePathname, router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useGroup } from "../contexts/GroupContext";
import { useLocale } from "../contexts/LocaleContext";
import { useTheme } from "../contexts/ThemeContext";
import { shape } from "../theme/shape";

export function WebSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { activeGroup } = useGroup();
  const { colors } = useTheme();
  const { t } = useLocale();

  const nav = useMemo(
    () => [
      { href: "/(tabs)/", label: t("nav.home"), icon: "view-dashboard" as const },
      { href: "/(tabs)/transactions", label: t("nav.transactions"), icon: "swap-horizontal" as const },
      { href: "/(tabs)/accounts", label: t("nav.accounts"), icon: "wallet" as const },
      { href: "/(tabs)/charts", label: t("nav.charts"), icon: "chart-arc" as const },
      { href: "/(tabs)/categories", label: t("more.categories"), icon: "shape" as const },
      { href: "/(tabs)/recurring", label: t("more.recurring"), icon: "cash-sync" as const },
      { href: "/(tabs)/reminders", label: t("more.reminders"), icon: "bell" as const },
      { href: "/(tabs)/groups", label: t("more.groups"), icon: "account-group" as const },
      { href: "/(tabs)/export-import", label: t("more.exportImport"), icon: "file-export" as const },
      { href: "/(tabs)/settings", label: t("more.settings"), icon: "cog" as const },
    ],
    [t]
  );

  const styles = StyleSheet.create({
    sidebar: {
      width: 260,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
    logo: { width: 56, height: 56, borderRadius: shape.md },
    brandText: { color: colors.text, fontWeight: "700", fontSize: 18 },
    group: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    navItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginHorizontal: 12,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: shape.full,
    },
    navActive: { backgroundColor: colors.accentContainer },
    navLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: "500" },
    navLabelActive: { color: colors.accent, fontWeight: "700" },
    footer: { marginTop: "auto", paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
    user: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
    logout: { color: colors.danger, fontWeight: "600", fontSize: 14 },
  });

  const isActive = (href: string) => {
    if (href === "/(tabs)/") return pathname === "/" || pathname === "/(tabs)" || pathname.endsWith("/index");
    return pathname.startsWith(href.replace("/(tabs)", ""));
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={styles.brandText}>{t("login.title")}</Text>
          {activeGroup ? <Text style={styles.group}>{activeGroup.name}</Text> : null}
        </View>
      </View>
      <ScrollView>
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Pressable
              key={item.href}
              style={[styles.navItem, active && styles.navActive]}
              onPress={() => router.push(item.href as any)}
            >
              <MaterialCommunityIcons name={item.icon} size={22} color={active ? colors.accent : colors.textSecondary} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        {user ? <Text style={styles.user}>{user.username}</Text> : null}
        <Pressable onPress={logout}>
          <Text style={styles.logout}>{t("common.logout")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
