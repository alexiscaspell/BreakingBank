import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { DonutChart } from "../../src/components/DonutChart";
import { AccountPickerModal } from "../../src/components/AccountPickerModal";
import { listAccounts, getAnalyticsSummary } from "../../src/data";
import { Fab } from "../../src/components/Fab";
import { PeriodTabs } from "../../src/components/PeriodTabs";
import { TypeTabs } from "../../src/components/TypeTabs";
import { ChipGroup } from "../../src/components/material/Chip";
import { CategoryIcon } from "../../src/components/CategoryIcon";
import { AppBar } from "../../src/components/material/AppBar";
import { Surface } from "../../src/components/material/Surface";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useGroup } from "../../src/contexts/GroupContext";
import { useLocale } from "../../src/contexts/LocaleContext";
import type { PeriodKey } from "../../src/i18n";
import { formatMoney, monthLabel } from "../../src/utils/format";
import { periodBounds } from "../../src/utils/period";
import { monthBoundsFromKey, monthOptions } from "../../src/utils/period";
import { shape } from "../../src/theme/shape";

type Summary = {
  total: number;
  by_category: Array<{
    category_id: string;
    category_name: string;
    color: string;
    icon_type: string;
    icon_key: string | null;
    icon_storage_key: string | null;
    total: number;
    percentage: number;
  }>;
};
type Account = { id: string; name: string; balance: number };

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t, localeTag } = useLocale();
  const { activeGroup } = useGroup();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [monthKey, setMonthKey] = useState("");
  const months = useMemo(() => monthOptions(24, localeTag), [localeTag]);
  const activeMonthKey = monthKey || months[0]?.key || "";
  const now = new Date();
  const { start, end } = useMemo(() => {
    if (period === "month" && activeMonthKey) return monthBoundsFromKey(activeMonthKey);
    return periodBounds(period, now);
  }, [period, activeMonthKey, now.getMonth(), now.getFullYear(), now.getDate()]);
  const periodLabel = useMemo(() => {
    if (period === "month" && activeMonthKey) {
      const [y, m] = activeMonthKey.split("-").map(Number);
      return monthLabel(new Date(y, m - 1, 1));
    }
    if (period === "year") return String(now.getFullYear());
    if (period === "day") return monthLabel(now);
    return `${start} — ${end}`;
  }, [period, activeMonthKey, start, end, now]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  const load = useCallback(async () => {
    const accs = await listAccounts();
    setAccounts(accs);
    setSummary(
      await getAnalyticsSummary({
        type,
        from: start,
        to: end,
        account_id: selectedAccountId,
      })
    );
  }, [type, start, end, selectedAccountId]);

  useFocusEffect(useCallback(() => { load().catch(console.error); }, [load]));
  const pieData = (summary?.by_category ?? []).slice(0, 6).map((c) => ({ value: c.total, color: c.color }));

  const selectedAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null;
  const headerBalance = selectedAccount ? selectedAccount.balance : accounts.reduce((s, a) => s + a.balance, 0);
  const headerLabel = selectedAccount?.name ?? t("common.allAccounts");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        balanceCard: { margin: 16, padding: 20, alignItems: "center", gap: 8 },
        accountBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
        accountLabel: { color: colors.accent, fontSize: 14, fontWeight: "600" },
        balance: { color: colors.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
        month: { color: colors.textSecondary, textAlign: "center", fontSize: 13, marginBottom: 8 },
        chartCard: { marginHorizontal: 16, marginBottom: 12, padding: 24, alignItems: "center" },
        row: {
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: 16,
          marginBottom: 8,
          padding: 14,
          gap: 12,
        },
        catName: { flex: 1, color: colors.text, fontWeight: "600", fontSize: 15 },
        pct: { color: colors.textSecondary, width: 44, fontSize: 13 },
        amt: { color: colors.text, fontWeight: "700", fontSize: 15 },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <AppBar
        title={t("nav.home")}
        subtitle={activeGroup?.name}
        trailing={
          <Pressable onPress={() => router.push("/(tabs)/transactions")} hitSlop={12}>
            <MaterialCommunityIcons name="history" size={26} color={colors.textSecondary} />
          </Pressable>
        }
      />
      <Surface style={styles.balanceCard} radius={shape.lg}>
        <Pressable style={styles.accountBtn} onPress={() => setAccountPickerOpen(true)}>
          <Text style={styles.accountLabel}>{headerLabel}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.accent} />
        </Pressable>
        <Text style={styles.balance}>{formatMoney(headerBalance, true)}</Text>
      </Surface>
      <TypeTabs value={type} onChange={setType} />
      <PeriodTabs value={period} onChange={setPeriod} />
      {period === "month" ? (
        <ChipGroup items={months.slice(0, 6)} value={activeMonthKey} onChange={setMonthKey} scrollable />
      ) : null}
      <Text style={styles.month}>{periodLabel}</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Surface style={styles.chartCard} radius={shape.lg}>
          <DonutChart data={pieData} total={summary?.total ?? 0} />
        </Surface>
        {(summary?.by_category ?? []).map((c) => (
          <Surface key={c.category_id} style={styles.row} radius={shape.md}>
            <CategoryIcon
              iconType={c.icon_type}
              iconKey={c.icon_key}
              iconStorageKey={c.icon_storage_key}
              color={c.color}
              size={40}
            />
            <Text style={styles.catName}>{c.category_name}</Text>
            <Text style={styles.pct}>{c.percentage}%</Text>
            <Text style={styles.amt}>{formatMoney(c.total, true)}</Text>
          </Surface>
        ))}
      </ScrollView>
      <Fab onPress={() => router.push({ pathname: "/add-transaction", params: { type } })} />
      <AccountPickerModal
        visible={accountPickerOpen}
        accounts={accounts}
        selectedId={selectedAccountId}
        onSelect={(id) => {
          setSelectedAccountId(id);
          setAccountPickerOpen(false);
        }}
        onClose={() => setAccountPickerOpen(false)}
      />
    </View>
  );
}
