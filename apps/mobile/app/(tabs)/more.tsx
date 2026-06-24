import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppBar } from "../../src/components/material/AppBar";
import { ListTile } from "../../src/components/material/ListTile";
import { Surface } from "../../src/components/material/Surface";
import { useAuth } from "../../src/contexts/AuthContext";
import { useGroup } from "../../src/contexts/GroupContext";
import { formatSyncTime, useSync } from "../../src/contexts/SyncContext";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Button } from "../../src/components/material/Button";
import { shape } from "../../src/theme/shape";

export default function MoreScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const { activeGroup } = useGroup();
  const { lastSync, syncing, triggerSync } = useSync();

  const menu = useMemo(
    () => [
      { href: "/(tabs)/export-import", title: t("more.exportImport"), subtitle: t("more.exportImportSub"), icon: "file-export" as const },
      { href: "/(tabs)/categories", title: t("more.categories"), subtitle: t("more.categoriesSub"), icon: "shape" as const },
      { href: "/(tabs)/recurring", title: t("more.recurring"), subtitle: t("more.recurringSub"), icon: "cash-sync" as const },
      { href: "/(tabs)/reminders", title: t("more.reminders"), subtitle: t("more.remindersSub"), icon: "bell" as const },
      { href: "/(tabs)/groups", title: t("more.groups"), subtitle: t("more.groupsSub"), icon: "account-group" as const },
      { href: "/(tabs)/settings", title: t("more.settings"), subtitle: t("more.settingsSub"), icon: "cog" as const },
    ],
    [t]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        section: { marginHorizontal: 16, marginTop: 16 },
        sectionLabel: {
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 8,
          marginLeft: 4,
        },
        card: { paddingVertical: 4, overflow: "hidden" },
        syncBox: { margin: 16, padding: 16, gap: 12 },
        syncText: { color: colors.textSecondary, fontSize: 13 },
        userText: { color: colors.text, fontSize: 15, fontWeight: "600" },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <AppBar
        title={t("more.title")}
        subtitle={activeGroup ? `${t("common.group")}: ${activeGroup.name}` : undefined}
        large
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("more.organization")}</Text>
          <Surface style={styles.card} radius={shape.lg}>
            {menu.map((item) => (
              <ListTile
                key={item.href}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                onPress={() => router.push(item.href as any)}
              />
            ))}
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("more.account")}</Text>
          <Surface style={styles.syncBox} radius={shape.lg}>
            <Text style={styles.userText}>{user?.username}</Text>
            <Text style={styles.syncText}>{syncing ? t("common.syncing") : formatSyncTime(lastSync)}</Text>
            <Button label={t("common.syncNow")} variant="tonal" onPress={() => triggerSync().catch(console.error)} fullWidth />
            <Button label={t("common.logout")} variant="outlined" onPress={() => logout()} fullWidth />
          </Surface>
        </View>
      </ScrollView>
    </View>
  );
}
