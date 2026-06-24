import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { AmountWithCurrency } from "../src/components/AmountWithCurrency";
import { DateField } from "../src/components/DateField";
import { parseAmountInput, formatAmountInput, type CurrencyCode } from "../src/constants/currencies";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { useLocale } from "../src/contexts/LocaleContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { completeRecurringReminder, getReminder, listAccounts, listCategories } from "../src/data";
import { convertFromBase, convertToBase } from "../src/services/currency";
import { parseRecurringPayload } from "../src/services/recurringProcessor";
import { shape } from "../src/theme/shape";
import { formatMoney } from "../src/utils/format";

export default function RecurringConfirmScreen() {
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { defaultCurrency, ready: currencyReady } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>("ARS");
  const [date, setDate] = useState("");
  const [comment, setComment] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        title: { color: colors.text, fontSize: 18, fontWeight: "700", flex: 1 },
        close: { color: colors.textSecondary, fontSize: 22 },
        body: { padding: 16 },
        card: { backgroundColor: colors.card, borderRadius: shape.lg, padding: 16, marginBottom: 12 },
        label: { color: colors.textSecondary, marginBottom: 6 },
        value: { color: colors.text, fontSize: 16, fontWeight: "600" },
        chip: {
          borderWidth: 1,
          borderColor: colors.accent,
          borderRadius: shape.full,
          paddingHorizontal: 10,
          paddingVertical: 6,
          marginRight: 8,
          marginBottom: 8,
          color: colors.text,
        },
        chipActive: { backgroundColor: colors.accent, color: "#000" },
        row: { flexDirection: "row", flexWrap: "wrap" },
        input: { backgroundColor: colors.surfaceVariant, color: colors.text, borderRadius: shape.md, padding: 12 },
        btn: { borderRadius: shape.lg, padding: 16, alignItems: "center", marginTop: 10 },
        btnPrimary: { backgroundColor: colors.fab },
        btnGhost: { borderWidth: 1, borderColor: colors.border },
        btnText: { fontWeight: "700" },
      }),
    [colors]
  );

  useEffect(() => {
    if (!reminderId) return;
    getReminder(String(reminderId)).then(async (reminder) => {
      if (!reminder) return;
      setTitle(reminder.title);
      const draft = parseRecurringPayload(reminder.payload);
      if (!draft) return;
      setType(draft.type);
      setDate(draft.due_date);
      setComment(draft.comment ?? "");
      setAccountId(draft.account_id);
      setCategoryId(draft.category_id);
      const [accs, cats] = await Promise.all([listAccounts(), listCategories(draft.type)]);
      setAccounts(accs);
      setCategories(cats);
      if (currencyReady) {
        setEntryCurrency(defaultCurrency);
        setAmount(formatAmountInput(convertFromBase(draft.amount, defaultCurrency), defaultCurrency));
      }
    }).catch(console.error);
  }, [reminderId, currencyReady, defaultCurrency]);

  const finish = async (withEdits: boolean) => {
    if (!reminderId) return;
    setLoading(true);
    try {
      const overrides = withEdits && editing
        ? {
            type,
            amount: convertToBase(parseAmountInput(amount) ?? 0, entryCurrency),
            account_id: accountId ?? undefined,
            category_id: categoryId ?? undefined,
            date,
            comment: comment || null,
          }
        : undefined;
      await completeRecurringReminder(String(reminderId), overrides);
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("recurring.confirmFailed");
      if (Platform.OS !== "web") Alert.alert(t("common.error"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("recurring.confirmTitle")}</Text>
        <Pressable onPress={() => finish(false)} disabled={loading}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.label}>{title}</Text>
          <Text style={styles.value}>{formatMoney(convertToBase(parseAmountInput(amount) ?? 0, entryCurrency))}</Text>
        </View>
        {editing ? (
          <>
            <AmountWithCurrency
              amount={amount}
              currency={entryCurrency}
              onAmountChange={setAmount}
              onCurrencyChange={setEntryCurrency}
            />
            <DateField value={date} onChange={setDate} />
            <Text style={styles.label}>{t("addTx.comment")}</Text>
            <TextInput style={styles.input} value={comment} onChangeText={setComment} multiline />
            <Text style={styles.label}>{t("recurring.account")}</Text>
            <View style={styles.row}>
              {accounts.map((a) => (
                <Pressable key={a.id} onPress={() => setAccountId(a.id)}>
                  <Text style={[styles.chip, accountId === a.id && styles.chipActive]}>{a.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t("recurring.category")}</Text>
            <View style={styles.row}>
              {categories.map((c) => (
                <Pressable key={c.id} onPress={() => setCategoryId(c.id)}>
                  <Text style={[styles.chip, categoryId === c.id && styles.chipActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>{t("recurring.confirmHint")}</Text>
        )}
        {!editing ? (
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(true)}>
            <Text style={styles.btnText}>{t("recurring.editBeforeCreate")}</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => finish(true)} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "..." : t("recurring.createNow")}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => finish(false)} disabled={loading}>
          <Text style={styles.btnText}>{t("recurring.dismissCreate")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
