import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppBar } from "../../src/components/material/AppBar";
import { Surface } from "../../src/components/material/Surface";
import { CurrencyPickerModal } from "../../src/components/CurrencyPickerModal";
import { BASE_CURRENCY, getCurrencyInfo, type CurrencyCode } from "../../src/constants/currencies";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import { useGroup } from "../../src/contexts/GroupContext";
import { useLocale } from "../../src/contexts/LocaleContext";
import { clearConflicts, listConflicts } from "../../src/sync";
import { usesOfflineStore } from "../../src/data";
import { useSync, formatSyncTime } from "../../src/contexts/SyncContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import type { ThemePreference } from "../../src/services/theme";
import type { LanguagePreference } from "../../src/services/language";
import type { SyncConflict } from "../../src/sync/conflicts";
import { shape } from "../../src/theme/shape";

const THEME_OPTIONS: ThemePreference[] = ["light", "dark", "system"];
const LANGUAGE_OPTIONS: LanguagePreference[] = ["system", "es", "en"];

export default function SettingsScreen() {
  const { colors, preference: themePreference, setPreference: setThemePreference } = useTheme();
  const { t, preference: languagePreference, setPreference: setLanguagePreference } = useLocale();
  const { activeGroup } = useGroup();
  const offline = usesOfflineStore();
  const { lastSync, syncing, pendingCount, conflictCount, triggerSync, refreshStats } = useSync();
  const { defaultCurrency, refresh, setDefaultCurrency } = useCurrency();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [currencyPicker, setCurrencyPicker] = useState(false);

  const themeLabel = (value: ThemePreference) => t(`theme.${value}`);
  const languageLabel = (value: LanguagePreference) => t(`language.${value}`);

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
        item: { padding: 16 },
        itemText: { color: colors.text, fontWeight: "600", fontSize: 16 },
        meta: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
        optionRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
        optionChip: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: shape.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceVariant,
        },
        optionChipActive: { borderColor: colors.accent, backgroundColor: colors.accentContainer },
        optionChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
        optionChipTextActive: { color: colors.accent, fontWeight: "700" },
        warn: { color: colors.warning },
        conflictLine: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
      }),
    [colors]
  );

  useFocusEffect(
    useCallback(() => {
      if (!offline) return;
      refreshStats().catch(console.error);
      listConflicts().then(setConflicts).catch(console.error);
    }, [offline, refreshStats])
  );

  return (
    <View style={styles.container}>
      <AppBar title={t("settings.title")} showBack large />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("settings.appearance")}</Text>
          <Surface radius={shape.lg}>
            <View style={styles.item}>
              <Text style={styles.itemText}>{t("settings.theme")}</Text>
              <View style={styles.optionRow}>
                {THEME_OPTIONS.map((opt) => {
                  const active = themePreference === opt;
                  return (
                    <Pressable
                      key={opt}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setThemePreference(opt).catch(console.error)}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {themeLabel(opt)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemText}>{t("settings.language")}</Text>
              <View style={styles.optionRow}>
                {LANGUAGE_OPTIONS.map((opt) => {
                  const active = languagePreference === opt;
                  return (
                    <Pressable
                      key={opt}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setLanguagePreference(opt).catch(console.error)}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {languageLabel(opt)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("settings.general")}</Text>
          <Surface radius={shape.lg}>
            <Pressable style={styles.item} onPress={() => router.push("/(tabs)/groups")}>
              <Text style={styles.itemText}>
                {t("common.group")}: {activeGroup?.name ?? "—"}
              </Text>
              <Text style={styles.meta}>{t("settings.groupManage")}</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={() => setCurrencyPicker(true)}>
              <Text style={styles.itemText}>
                {t("settings.currency")}: {defaultCurrency} ({getCurrencyInfo(defaultCurrency).name})
              </Text>
            </Pressable>
            <Pressable style={styles.item} onPress={() => refresh().catch(console.error)}>
              <Text style={styles.itemText}>{t("settings.refreshRates")}</Text>
            </Pressable>
          </Surface>
        </View>

        {offline ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("settings.sync")}</Text>
            <Surface radius={shape.lg}>
              <Pressable style={styles.item} onPress={() => triggerSync().catch(console.error)} disabled={syncing}>
                <Text style={styles.itemText}>{formatSyncTime(lastSync)}</Text>
                <Text style={styles.meta}>{syncing ? t("common.syncing") : t("settings.tapToSync")}</Text>
              </Pressable>
              <Text style={styles.item}>
                {t("settings.pending")}: {pendingCount}
              </Text>
              <Text style={[styles.item, conflictCount > 0 && styles.warn]}>
                {t("settings.conflicts")}: {conflictCount}
              </Text>
              {conflicts.slice(0, 5).map((c) => (
                <Text key={c.id} style={[styles.conflictLine, { paddingHorizontal: 16 }]}>
                  · {c.entity} — {c.message}
                </Text>
              ))}
            </Surface>
          </View>
        ) : null}
      </ScrollView>
      <CurrencyPickerModal
        visible={currencyPicker}
        selected={defaultCurrency}
        onSelect={(code: CurrencyCode) => {
          void setDefaultCurrency(code);
          setCurrencyPicker(false);
        }}
        onClose={() => setCurrencyPicker(false)}
      />
    </View>
  );
}
