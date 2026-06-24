import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { deleteTransaction, listTransactions, type Transaction } from "../../src/data";
import { CategoryIcon } from "../../src/components/CategoryIcon";
import { Fab } from "../../src/components/Fab";
import { TypeTabs } from "../../src/components/TypeTabs";
import { ChipGroup } from "../../src/components/material/Chip";
import { AppBar } from "../../src/components/material/AppBar";
import { Surface } from "../../src/components/material/Surface";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { formatMoney } from "../../src/utils/format";
import { monthBoundsFromKey, monthOptions } from "../../src/utils/period";
import { shape } from "../../src/theme/shape";

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { t, localeTag } = useLocale();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [txs, setTxs] = useState<Transaction[]>([]);
  const months = useMemo(() => monthOptions(24, localeTag), [localeTag]);
  const [monthKey, setMonthKey] = useState("");
  const activeMonthKey = monthKey || months[0]?.key || "";
  const { start, end } = useMemo(() => monthBoundsFromKey(activeMonthKey), [activeMonthKey]);
  const activeMonth = months.find((m) => m.key === activeMonthKey);

  const load = useCallback(async () => {
    setTxs(await listTransactions({ type, from: start, to: end }));
  }, [type, start, end]);

  useFocusEffect(useCallback(() => { load().catch(console.error); }, [load]));
  const total = txs.reduce((s, t) => s + t.amount, 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        month: { color: colors.textSecondary, textAlign: "center", marginVertical: 8, fontSize: 13 },
        monthRow: { marginHorizontal: 16, marginBottom: 4 },
        card: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, alignItems: "flex-start" },
        cat: { color: colors.text, fontWeight: "700", fontSize: 15 },
        tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
        tag: {
          color: colors.accent,
          backgroundColor: colors.accentContainer,
          borderRadius: shape.full,
          paddingHorizontal: 8,
          paddingVertical: 3,
          fontSize: 11,
          fontWeight: "600",
        },
        comment: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
        amount: { color: colors.text, fontWeight: "700", fontSize: 15 },
      }),
    [colors]
  );

  const remove = (tx: Transaction) => {
    Alert.alert(t("transactions.deleteTitle"), t("transactions.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(tx.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppBar title={t("nav.transactions")} subtitle={`${t("common.total")}: ${formatMoney(total)}`} large />
      <TypeTabs value={type} onChange={setType} />
      <View style={styles.monthRow}>
        <ChipGroup items={months.slice(0, 12)} value={activeMonthKey} onChange={setMonthKey} scrollable />
      </View>
      <Text style={styles.month}>{activeMonth?.fullLabel ?? ""}</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {txs.map((tx) => (
          <Pressable
            key={tx.id}
            onPress={() => router.push({ pathname: "/add-transaction", params: { id: tx.id, type: tx.type } })}
            onLongPress={() => remove(tx)}
          >
            <Surface style={styles.card} radius={shape.md}>
              {tx.category && (
                <CategoryIcon
                  iconType={tx.category.icon_type}
                  iconKey={tx.category.icon_key}
                  iconStorageKey={tx.category.icon_storage_key}
                  color={tx.category.color}
                  size={40}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cat}>{tx.category?.name ?? t("common.noCategory")}</Text>
                <View style={styles.tags}>
                  {(tx.labels ?? []).map((l) => (
                    <Text key={l.name} style={styles.tag}>
                      {l.name}
                    </Text>
                  ))}
                </View>
                {tx.comment ? <Text style={styles.comment}>{tx.comment}</Text> : null}
              </View>
              <Text style={styles.amount}>{formatMoney(tx.amount)}</Text>
            </Surface>
          </Pressable>
        ))}
      </ScrollView>
      <Fab onPress={() => router.push({ pathname: "/add-transaction", params: { type } })} />
    </View>
  );
}
