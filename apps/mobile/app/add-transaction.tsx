import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  createLabel,
  createTransaction,
  deleteTransaction,
  getTransaction,
  listAccounts,
  listCategories,
  listLabels,
  updateTransaction,
} from "../src/data";
import { AmountWithCurrency } from "../src/components/AmountWithCurrency";
import { CategoryIcon } from "../src/components/CategoryIcon";
import { DateField } from "../src/components/DateField";
import { TypeTabs } from "../src/components/TypeTabs";
import { parseAmountInput, formatAmountInput, type CurrencyCode } from "../src/constants/currencies";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { useLocale } from "../src/contexts/LocaleContext";
import { convertFromBase, convertToBase, todayIsoDate } from "../src/services/currency";
import { confirmAsync } from "../src/utils/confirm";
import { colors } from "../src/theme/colors";

type Category = {
  id: string;
  name: string;
  color: string;
  icon_type: string;
  icon_key: string | null;
  icon_storage_key: string | null;
};
type Account = { id: string; name: string };
type Label = { id: string; name: string };

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const editingId = params.id ? String(params.id) : null;
  const [type, setType] = useState<"expense" | "income">((params.type as "expense" | "income") ?? "expense");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>("ARS");
  const { defaultCurrency, ready: currencyReady } = useCurrency();
  const { t, tf } = useLocale();

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
    getTransaction(editingId).then((txn) => {
      if (!txn) return;
      setType(txn.type as "expense" | "income");
      setDate(txn.date);
      setComment(txn.comment ?? "");
      setSelectedAccount(txn.account_id);
      setSelectedCategory(txn.category_id);
      setSelectedLabels((txn.labels ?? []).map((l) => l.id));
      setEntryCurrency(defaultCurrency);
      setAmount(formatAmountInput(convertFromBase(txn.amount, defaultCurrency), defaultCurrency));
    }).catch(console.error);
  }, [editingId, currencyReady, defaultCurrency]);

  const toggleLabel = (id: string) =>
    setSelectedLabels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addLabel = async () => {
    const trimmed = newLabelName.trim();
    if (!trimmed) return;
    try {
      const label = await createLabel(trimmed);
      setLabels((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedLabels((prev) => [...prev, label.id]);
      setNewLabelName("");
      setShowNewLabel(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("addTx.labelFailed"));
    }
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!r.canceled && photos.length < 3) setPhotos([...photos, r.assets[0].uri]);
  };

  const submit = async () => {
    setError(null);
    if (!amount.trim()) {
      setError(t("addTx.enterAmount"));
      return;
    }
    if (!selectedCategory) {
      setError(
        tf("addTx.selectCategory", {
          kind: type === "expense" ? t("addTx.expenseKind") : t("addTx.incomeKind"),
        })
      );
      return;
    }
    if (!selectedAccount) {
      setError(t("addTx.selectAccount"));
      return;
    }
    const parsed = parseAmountInput(amount);
    if (parsed === null || parsed <= 0) {
      setError(t("addTx.invalidAmount"));
      return;
    }
    const amountInBase = convertToBase(parsed, entryCurrency);
    setLoading(true);
    try {
      const payload = {
        type,
        amount: amountInBase,
        account_id: selectedAccount,
        category_id: selectedCategory,
        date,
        comment: comment || null,
        label_ids: selectedLabels,
        photoUris: photos.length ? photos : undefined,
      };
      if (editingId) {
        await updateTransaction(editingId, payload);
      } else {
        await createTransaction(payload);
      }
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("addTx.saveFailed");
      setError(msg);
      if (Platform.OS !== "web") Alert.alert(t("common.error"), msg);
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    const ok = await confirmAsync(t("addTx.deleteTitle"), t("addTx.deleteMsg"));
    if (!ok) return;
    await deleteTransaction(editingId);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <Text style={styles.title}>{editingId ? t("addTx.editTitle") : t("addTx.newTitle")}</Text>
        {editingId ? (
          <Pressable onPress={remove}><Text style={styles.delete}>🗑</Text></Pressable>
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
        <DateField value={date} onChange={setDate} />
        <Text style={styles.label}>Cuenta</Text>
        <View style={styles.accounts}>
          {accounts.map((a) => (
            <Pressable key={a.id} onPress={() => setSelectedAccount(a.id)}>
              <Text style={[styles.chip, selectedAccount === a.id && styles.chipActive]}>{a.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Categorías</Text>
        {categories.length === 0 ? (
          <Text style={styles.hint}>No hay categorías de {type === "expense" ? "gastos" : "ingresos"}. Creá una en Categorías.</Text>
        ) : (
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
        )}
        <Text style={styles.label}>{t("addTx.labels")}</Text>
        <View style={styles.tags}>
          {labels.map((l) => (
            <Pressable key={l.id} onPress={() => toggleLabel(l.id)}>
              <Text style={[styles.chip, selectedLabels.includes(l.id) && styles.chipActive]}>{l.name}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setShowNewLabel((v) => !v)}>
            <Text style={styles.plusChip}>+</Text>
          </Pressable>
        </View>
        {showNewLabel && (
          <View style={styles.newLabelRow}>
            <TextInput
              style={styles.newLabelInput}
              placeholder={t("addTx.newLabel")}
              placeholderTextColor="#666"
              value={newLabelName}
              onChangeText={setNewLabelName}
              onSubmitEditing={addLabel}
            />
            <Pressable style={styles.newLabelOk} onPress={addLabel}>
              <Text style={styles.newLabelOkText}>OK</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.label}>{t("addTx.comment")}</Text>
        <TextInput
          style={styles.input}
          multiline
          maxLength={4096}
          placeholder={t("addTx.comment")}
          placeholderTextColor="#666"
          value={comment}
          onChangeText={setComment}
        />
        {!editingId && (
          <>
            <Text style={styles.label}>{t("addTx.photo")}</Text>
            <View style={styles.photos}>
              {[0, 1, 2].map((i) => (
                <Pressable key={i} style={styles.photoSlot} onPress={pickPhoto}>
                  {photos[i] ? <Text>📷</Text> : <Text style={styles.plusPhoto}>+</Text>}
                </Pressable>
              ))}
            </View>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.submit} onPress={submit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? "..." : editingId ? t("addTx.save") : t("addTx.add")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.header,
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
  catItem: { width: "25%", alignItems: "center", marginBottom: 12, padding: 4, borderRadius: 8 },
  catItemActive: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent },
  catLabel: { color: colors.text, fontSize: 11, textAlign: "center", marginTop: 4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: { color: colors.text, borderWidth: 1, borderColor: colors.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12 },
  chipActive: { backgroundColor: colors.accent, color: "#000" },
  plusChip: {
    color: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: "700",
  },
  newLabelRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  newLabelInput: { flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 8, padding: 10 },
  newLabelOk: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  newLabelOkText: { color: "#000", fontWeight: "700" },
  input: { backgroundColor: colors.card, color: colors.text, borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: "top" },
  photos: { flexDirection: "row", gap: 8 },
  photoSlot: { width: 80, height: 80, backgroundColor: colors.card, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  plusPhoto: { color: colors.text, fontSize: 28 },
  error: { color: colors.danger, marginTop: 12, textAlign: "center" },
  submit: { backgroundColor: colors.fab, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  submitText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
