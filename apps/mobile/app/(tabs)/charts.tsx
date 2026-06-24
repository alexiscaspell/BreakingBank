import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CategoryBarChart } from "../../src/components/CategoryBarChart";
import { getAnalyticsSummary } from "../../src/data";
import { AppBar } from "../../src/components/material/AppBar";
import { Surface } from "../../src/components/material/Surface";
import { TypeTabs } from "../../src/components/TypeTabs";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { formatMoney } from "../../src/utils/format";
import { shape } from "../../src/theme/shape";

export default function ChartsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [data, setData] = useState<{
    total: number;
    by_category: { category_name: string; total: number; color: string }[];
  } | null>(null);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setData(await getAnalyticsSummary({ type, from: start, to: end }));
  }, [type, start, end]);

  useFocusEffect(useCallback(() => { load().catch(console.error); }, [load]));

  const barData = (data?.by_category ?? [])
    .slice(0, 6)
    .map((c) => ({ value: c.total, label: c.category_name.slice(0, 4), frontColor: c.color }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        card: { margin: 16, padding: 20, alignItems: "center" },
        total: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 16 },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <AppBar title={t("nav.charts")} large />
      <TypeTabs value={type} onChange={setType} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Surface style={styles.card} radius={shape.lg}>
          <Text style={styles.total}>{formatMoney(data?.total ?? 0, true)}</Text>
          {barData.length > 0 && <CategoryBarChart data={barData} />}
        </Surface>
      </ScrollView>
    </View>
  );
}
