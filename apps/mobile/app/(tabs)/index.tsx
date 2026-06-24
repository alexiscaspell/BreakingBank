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
import { CategoryIcon } from "../../src/components/CategoryIcon";
import { AppBar } from "../../src/components/material/AppBar";
import { Surface } from "../../src/components/material/Surface";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useGroup } from "../../src/contexts/GroupContext";
import { useLocale } from "../../src/contexts/LocaleContext";
import type { PeriodKey } from "../../src/i18n";
import { formatMoney, monthLabel } from "../../src/utils/format";
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
  const { t } = useLocale();
  const { activeGroup } = useGroup();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

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
      <Text style={styles.month}>{monthLabel(now)}</Text>
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
