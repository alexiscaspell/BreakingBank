import { useMemo, type ComponentProps } from "react";
import { usePathname, router } from "expo-router";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useGroup } from "../contexts/GroupContext";
import { useLocale } from "../contexts/LocaleContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useTheme } from "../contexts/ThemeContext";
import { shape } from "../theme/shape";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
};

type Props = {
  autoCollapseOnNavigate?: boolean;
};

export function AppSidebar({ autoCollapseOnNavigate = false }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { activeGroup } = useGroup();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { collapse } = useSidebar();
  const insets = useSafeAreaInsets();

  const nav = useMemo<NavItem[]>(
    () => [
      { href: "/(tabs)/", label: t("nav.home"), icon: "view-dashboard" },
      { href: "/(tabs)/transactions", label: t("nav.transactions"), icon: "swap-horizontal" },
      { href: "/(tabs)/accounts", label: t("nav.accounts"), icon: "wallet" },
      { href: "/(tabs)/charts", label: t("nav.charts"), icon: "chart-arc" },
      { href: "/(tabs)/categories", label: t("more.categories"), icon: "shape" },
      { href: "/(tabs)/recurring", label: t("more.recurring"), icon: "cash-sync" },
      { href: "/(tabs)/reminders", label: t("more.reminders"), icon: "bell" },
      { href: "/(tabs)/groups", label: t("more.groups"), icon: "account-group" },
      { href: "/(tabs)/export-import", label: t("more.exportImport"), icon: "file-export" },
      { href: "/(tabs)/settings", label: t("more.settings"), icon: "cog" },
    ],
    [t]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sidebar: {
          width: 260,
          flex: 1,
          backgroundColor: colors.surface,
          paddingTop: Math.max(insets.top, 16) + 40,
          paddingBottom: Math.max(insets.bottom, 16),
        },
        brand: {
          alignItems: "center",
          paddingHorizontal: 20,
          paddingBottom: 20,
          gap: 8,
        },
        logo: { width: 96, height: 96 },
        group: { color: colors.textSecondary, fontSize: 12, textAlign: "center" },
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
        navLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: "500", flex: 1 },
        navLabelActive: { color: colors.accent, fontWeight: "700" },
        footer: {
          marginTop: "auto",
          paddingHorizontal: 20,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        user: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
        logout: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 8,
        },
        logoutText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
      }),
    [colors, insets.bottom, insets.top]
  );

  const isActive = (href: string) => {
    if (href === "/(tabs)/") return pathname === "/" || pathname === "/(tabs)" || pathname.endsWith("/index");
    return pathname.startsWith(href.replace("/(tabs)", ""));
  };

  const navigate = (href: string) => {
    if (autoCollapseOnNavigate) collapse();
    router.push(href as never);
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
        {activeGroup ? <Text style={styles.group}>{activeGroup.name}</Text> : null}
      </View>
      <ScrollView showsVerticalScrollIndicator={Platform.OS !== "web"}>
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Pressable
              key={item.href}
              style={[styles.navItem, active && styles.navActive]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => navigate(item.href)}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={active ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        {user ? <Text style={styles.user}>{user.username}</Text> : null}
        <Pressable
          style={styles.logout}
          accessibilityRole="button"
          accessibilityLabel={t("common.logout")}
          onPress={logout}
        >
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>{t("common.logout")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
