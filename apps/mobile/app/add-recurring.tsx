import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { AmountWithCurrency } from "../src/components/AmountWithCurrency";
import { CategoryIcon } from "../src/components/CategoryIcon";
import { DateField } from "../src/components/DateField";
import { TypeTabs } from "../src/components/TypeTabs";
import { parseAmountInput, formatAmountInput, type CurrencyCode } from "../src/constants/currencies";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { useLocale } from "../src/contexts/LocaleContext";
import { useTheme } from "../src/contexts/ThemeContext";
import {
  createRecurringPayment,
  deleteRecurringPayment,
  getRecurringPayment,
  listAccounts,
  listCategories,
  listLabels,
  updateRecurringPayment,
} from "../src/data";
import { convertFromBase, convertToBase, todayIsoDate } from "../src/services/currency";
import {
  anchorFromDateIso,
  computeInitialNextRun,
  type RecurringFrequency,
} from "../src/services/recurringSchedule";
import { shape } from "../src/theme/shape";
import { confirmAsync } from "../src/utils/confirm";

const FREQUENCIES: RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"];

export default function AddRecurringScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? String(params.id) : null;
  const { colors } = useTheme();
  const { t } = useLocale();
  const { defaultCurrency, ready: currencyReady } = useCurrency();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string; color: string; icon_type: string; icon_key: string | null; icon_storage_key: string | null }[]
  >([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [labels, setLabels] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>("ARS");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          backgroundColor: colors.surface,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 12,
        },
        back: { color: colors.text, fontSize: 24 },
        delete: { fontSize: 20 },
        title: { color: colors.text, fontSize: 18, fontWeight: "700" },
        label: { color: colors.textSecondary, marginTop: 12, marginBottom: 8 },
        hint: { color: colors.textSecondary, fontStyle: "italic", marginBottom: 8 },
        accounts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        grid: { flexDirection: "row", flexWrap: "wrap" },
        catItem: { width: "25%", alignItems: "center", marginBottom: 12, padding: 4, borderRadius: shape.md },
        catItemActive: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent },
        catLabel: { color: colors.text, fontSize: 11, textAlign: "center", marginTop: 4 },
        tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        chip: {
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.accent,
          borderRadius: shape.full,
          paddingHorizontal: 10,
          paddingVertical: 6,
          fontSize: 12,
        },
        chipActive: { backgroundColor: colors.accent, color: "#000" },
        input: {
          backgroundColor: colors.card,
          color: colors.text,
          borderRadius: shape.md,
          padding: 12,
          minHeight: 80,
          textAlignVertical: "top",
        },
        error: { color: colors.danger, marginTop: 12, textAlign: "center" },
        submit: {
          backgroundColor: colors.fab,
          borderRadius: shape.lg,
          padding: 16,
          alignItems: "center",
          marginTop: 20,
        },
        submitText: { color: "#000", fontWeight: "700", fontSize: 16 },
      }),
    [colors]
  );

  useEffect(() => {
    Promise.all([listCategories(type), listAccounts(), listLabels()])
      .then(([cats, accs, labs]) => {
        setCategories(cats);
        setAccounts(accs);
        setLabels(labs);
        setSelectedCategory((prev) => (cats.some((c) => c.id === prev) ? prev : cats[0]?.id ?? null));
        setSelectedAccount((prev) => (accs.some((a) => a.id === prev) ? prev : accs[0]?.id ?? null));
      })
      .catch(console.error);
  }, [type]);

  useEffect(() => {
    if (currencyReady) setEntryCurrency(defaultCurrency);
  }, [currencyReady, defaultCurrency]);

  useEffect(() => {
    if (!editingId || !currencyReady) return;
    getRecurringPayment(editingId).then((item) => {
      if (!item) return;
      setType(item.type as "expense" | "income");
      setComment(item.comment ?? "");
      setSelectedAccount(item.account_id);
      setSelectedCategory(item.category_id);
      setSelectedLabels(item.label_ids ?? []);
      setFrequency(item.frequency as RecurringFrequency);
      setStartDate(item.next_run_at.slice(0, 10));
      setActive(item.active);
      setAmount(formatAmountInput(convertFromBase(item.amount, defaultCurrency), defaultCurrency));
    }).catch(console.error);
  }, [editingId, currencyReady, defaultCurrency]);

  const toggleLabel = (id: string) =>
    setSelectedLabels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    setError(null);
    if (!amount.trim()) {
      setError(t("addTx.enterAmount"));
      return;
    }
    if (!selectedCategory || !selectedAccount) {
      setError(t("addTx.selectAccount"));
      return;
    }
    const parsed = parseAmountInput(amount);
    if (parsed === null || parsed <= 0) {
      setError(t("addTx.invalidAmount"));
      return;
    }
    const amountInBase = convertToBase(parsed, entryCurrency);
    const anchor = anchorFromDateIso(startDate);
    const nextRun = computeInitialNextRun(anchor, frequency);
    setLoading(true);
    try {
      const payload = {
        type,
        amount: amountInBase,
        account_id: selectedAccount,
        category_id: selectedCategory,
        frequency,
        next_run_at: nextRun.toISOString(),
        comment: comment || null,
        label_ids: selectedLabels,
        active,
      };
      if (editingId) {
        await updateRecurringPayment(editingId, payload);
      } else {
        await createRecurringPayment(payload);
      }
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("recurring.saveFailed");
      setError(msg);
      if (Platform.OS !== "web") Alert.alert(t("common.error"), msg);
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    const ok = await confirmAsync(t("recurring.deleteTitle"), t("recurring.deleteMsg"));
    if (!ok) return;
    await deleteRecurringPayment(editingId);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>{editingId ? t("recurring.editTitle") : t("recurring.newTitle")}</Text>
        {editingId ? (
          <Pressable onPress={remove}>
            <Text style={styles.delete}>🗑</Text>
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
      <TypeTabs value={type} onChange={setType} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <AmountWithCurrency
          amount={amount}
          currency={entryCurrency}
          onAmountChange={setAmount}
          onCurrencyChange={setEntryCurrency}
        />
        <Text style={styles.label}>{t("recurring.frequency")}</Text>
        <View style={styles.accounts}>
          {FREQUENCIES.map((f) => (
            <Pressable key={f} onPress={() => setFrequency(f)}>
              <Text style={[styles.chip, frequency === f && styles.chipActive]}>{t(`recurring.freq.${f}`)}</Text>
            </Pressable>
          ))}
        </View>
        <DateField value={startDate} onChange={setStartDate} />
        <Text style={styles.hint}>{t("recurring.startDateHint")}</Text>
        <Text style={styles.label}>{t("recurring.account")}</Text>
        <View style={styles.accounts}>
          {accounts.map((a) => (
            <Pressable key={a.id} onPress={() => setSelectedAccount(a.id)}>
              <Text style={[styles.chip, selectedAccount === a.id && styles.chipActive]}>{a.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t("recurring.category")}</Text>
        <View style={styles.grid}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.catItem, selectedCategory === c.id && styles.catItemActive]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <CategoryIcon iconType={c.icon_type} iconKey={c.icon_key} iconStorageKey={c.icon_storage_key} color={c.color} size={52} />
              <Text style={styles.catLabel}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t("addTx.labels")}</Text>
        <View style={styles.tags}>
          {labels.map((l) => (
            <Pressable key={l.id} onPress={() => toggleLabel(l.id)}>
              <Text style={[styles.chip, selectedLabels.includes(l.id) && styles.chipActive]}>{l.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t("addTx.comment")}</Text>
        <TextInput
          style={styles.input}
          multiline
          value={comment}
          onChangeText={setComment}
          placeholder={t("addTx.comment")}
          placeholderTextColor={colors.inputPlaceholder}
        />
        <Pressable onPress={() => setActive((v) => !v)}>
          <Text style={[styles.chip, active && styles.chipActive, { alignSelf: "flex-start", marginTop: 8 }]}>
            {active ? t("recurring.active") : t("recurring.paused")}
          </Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.submit} onPress={submit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? "..." : editingId ? t("addTx.save") : t("addTx.add")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
