import { useCallback, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { AppBar } from "../../src/components/material/AppBar";
import { Button } from "../../src/components/material/Button";
import { ChipGroup } from "../../src/components/material/Chip";
import { Surface } from "../../src/components/material/Surface";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { exportMonth, importFile, type ExportFormat, type TxType } from "../../src/services/exportImport";
import { showAlert } from "../../src/utils/alert";
import { monthLabel } from "../../src/utils/format";
import { monthOptions } from "../../src/utils/period";
import { shape } from "../../src/theme/shape";

const PICK_TYPES_WEB = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/comma-separated-values",
  "application/octet-stream",
];

const PICK_TYPES_NATIVE = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/comma-separated-values",
  "*/*",
];

export default function ExportImportScreen() {
  const { colors } = useTheme();
  const { t, tf, localeTag } = useLocale();
  const { defaultCurrency } = useCurrency();
  const months = useMemo(() => monthOptions(24, localeTag), [localeTag]);
  const [type, setType] = useState<TxType>("expense");
  const [monthKey, setMonthKey] = useState("");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [busy, setBusy] = useState(false);

  const activeMonthKey = monthKey || months[0]?.key || "";
  const [year, month] = activeMonthKey.split("-").map(Number);

  const formatOptions = useMemo(
    () => [
      { key: "xlsx" as const, label: t("exportImport.formatXlsx") },
      { key: "csv" as const, label: t("exportImport.formatCsv") },
    ],
    [t]
  );

  const monthLabelForKey = useCallback(
    (key: string) => {
      const [y, m] = key.split("-").map(Number);
      return monthLabel(new Date(y, m - 1, 1));
    },
    [localeTag]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        section: { marginHorizontal: 16, marginTop: 16, gap: 12 },
        sectionLabel: {
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginLeft: 4,
        },
        card: { padding: 16, gap: 14 },
        hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
        actions: { gap: 10, marginTop: 4 },
      }),
    [colors]
  );

  const runExport = useCallback(async () => {
    setBusy(true);
    try {
      await exportMonth(type, year, month, format, defaultCurrency);
      showAlert(t("exportImport.exportDoneTitle"), t("exportImport.exportDoneMsg"));
    } catch (e) {
      showAlert(t("common.error"), e instanceof Error ? e.message : t("exportImport.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [type, year, month, format, defaultCurrency, t]);

  const runImport = useCallback(async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === "web" ? PICK_TYPES_WEB : PICK_TYPES_NATIVE,
        copyToCacheDirectory: Platform.OS !== "web",
      });
      if (picked.canceled) return;
      if (!picked.assets?.[0]) {
        showAlert(t("common.error"), t("exportImport.importFailed"));
        return;
      }

      const asset = picked.assets[0];
      const filename = asset.name ?? (asset.mimeType?.includes("csv") ? "import.csv" : "import.xlsx");
      setBusy(true);
      const result = await importFile(type, asset.uri, filename, asset.mimeType);
      const dateHint =
        result.date_from && result.date_to
          ? `\n\n${tf("exportImport.importDateRange", { from: result.date_from, to: result.date_to })}`
          : "";
      const detail =
        result.errors.length > 0
          ? `\n\n${result.errors.slice(0, 5).join("\n")}${result.errors.length > 5 ? "\n…" : ""}`
          : "";
      showAlert(
        t("exportImport.importDoneTitle"),
        `${tf("exportImport.importDoneMsg", { created: result.created, skipped: result.skipped })}${dateHint}${detail}`
      );
    } catch (e) {
      showAlert(t("common.error"), e instanceof Error ? e.message : t("exportImport.importFailed"));
    } finally {
      setBusy(false);
    }
  }, [type, t, tf]);

  return (
    <View style={styles.container}>
      <AppBar title={t("more.exportImport")} subtitle={t("exportImport.subtitle")} showBack large />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("exportImport.period")}</Text>
          <Surface style={styles.card} radius={shape.lg}>
            <ChipGroup items={months.slice(0, 6)} value={activeMonthKey} onChange={setMonthKey} scrollable />
            <ChipGroup
              items={[
                { key: "expense", label: t("common.expenses") },
                { key: "income", label: t("common.income") },
              ]}
              value={type}
              onChange={(v) => setType(v as TxType)}
            />
            <Text style={styles.hint}>{tf("exportImport.columnsHint", { currency: defaultCurrency })}</Text>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("exportImport.exportSection")}</Text>
          <Surface style={styles.card} radius={shape.lg}>
            <ChipGroup items={formatOptions} value={format} onChange={(v) => setFormat(v as ExportFormat)} />
            <View style={styles.actions}>
              <Button
                label={
                  busy
                    ? t("exportImport.exporting")
                    : tf("exportImport.exportBtn", { month: monthLabelForKey(activeMonthKey) })
                }
                onPress={() => runExport().catch(console.error)}
                disabled={busy}
                fullWidth
              />
            </View>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("exportImport.importSection")}</Text>
          <Surface style={styles.card} radius={shape.lg}>
            <Text style={styles.hint}>{t("exportImport.importHint")}</Text>
            <View style={styles.actions}>
              <Button
                label={busy ? t("exportImport.importing") : t("exportImport.importBtn")}
                variant="tonal"
                onPress={() => runImport().catch(console.error)}
                disabled={busy}
                fullWidth
              />
            </View>
          </Surface>
        </View>
      </ScrollView>
    </View>
  );
}
