import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppBar } from "../../src/components/material/AppBar";
import { Button } from "../../src/components/material/Button";
import { Surface } from "../../src/components/material/Surface";
import { useFocusEffect } from "expo-router";
import { deleteRecurringPayment, listCategories, listRecurringPayments, type RecurringPayment } from "../../src/data";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { shape } from "../../src/theme/shape";
import { formatMoney, getFormatLocaleTag } from "../../src/utils/format";

export default function RecurringScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [items, setItems] = useState<RecurringPayment[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const list = await listRecurringPayments();
    setItems(list);
    const names: Record<string, string> = {};
    for (const type of ["expense", "income"]) {
      const cats = await listCategories(type);
      for (const c of cats) names[c.id] = c.name;
    }
    setCategoryNames(names);
  }, []);

  useFocusEffect(useCallback(() => { load().catch(console.error); }, [load]));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        empty: { color: colors.textSecondary, textAlign: "center", marginTop: 40 },
        card: { padding: 16, marginBottom: 8, flexDirection: "row", alignItems: "center" },
        cardBody: { flex: 1 },
        deleteBtn: {
          padding: 8,
          marginLeft: 8,
        },
        deleteText: { fontSize: 18 },
        amount: { color: colors.text, fontSize: 18, fontWeight: "700" },
        meta: { color: colors.textSecondary, marginTop: 4 },
        badge: { color: colors.accent, fontSize: 12, marginTop: 4 },
        fabWrap: { padding: 16 },
      }),
    [colors]
  );

  const remove = (item: RecurringPayment) => {
    Alert.alert(t("recurring.deleteTitle"), t("recurring.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteRecurringPayment(item.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppBar title={t("more.recurring")} showBack large />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {items.length === 0 ? (
          <Text style={styles.empty}>{t("recurring.empty")}</Text>
        ) : (
          <Surface radius={shape.lg}>
            {items.map((i) => (
              <View key={i.id} style={styles.card}>
                <Pressable
                  style={styles.cardBody}
                  onPress={() => router.push({ pathname: "/add-recurring", params: { id: i.id } })}
                >
                  <Text style={styles.amount}>{formatMoney(i.amount)}</Text>
                  <Text style={styles.meta}>
                    {categoryNames[i.category_id] ?? "—"} · {t(`recurring.freq.${i.frequency}` as "recurring.freq.monthly")}
                  </Text>
                  <Text style={styles.meta}>
                    {t("recurring.nextRun")}: {new Date(i.next_run_at).toLocaleDateString(getFormatLocaleTag())}
                  </Text>
                  {!i.active ? <Text style={styles.badge}>{t("recurring.paused")}</Text> : null}
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => remove(i)} accessibilityLabel={t("common.delete")}>
                  <Text style={styles.deleteText}>🗑</Text>
                </Pressable>
              </View>
            ))}
          </Surface>
        )}
      </ScrollView>
      <View style={styles.fabWrap}>
        <Button label={t("recurring.newTitle")} onPress={() => router.push("/add-recurring")} fullWidth />
      </View>
    </View>
  );
}
