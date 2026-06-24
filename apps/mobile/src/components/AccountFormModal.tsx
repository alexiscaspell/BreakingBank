import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ACCOUNT_ICON_PRESETS, COLOR_OPTIONS } from "../constants/presetIcons";
import { formatAmountInput, parseAmountInput, type CurrencyCode } from "../constants/currencies";
import { createAccount, updateAccount, type Account } from "../data";
import { useCurrency } from "../contexts/CurrencyContext";
import { convertFromBase, convertToBase } from "../services/currency";
import { AmountWithCurrency } from "./AmountWithCurrency";
import { IconPickerGrid } from "./IconPickerGrid";
import { colors } from "../theme/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Account | null;
};

export function AccountFormModal({ visible, onClose, onSaved, editing }: Props) {
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ACCOUNT_ICON_PRESETS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>("ARS");
  const { defaultCurrency, ready: currencyReady } = useCurrency();

  useEffect(() => {
    if (!visible || !currencyReady) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setEntryCurrency(defaultCurrency);
      setInitialBalance(
        formatAmountInput(convertFromBase(editing.initial_balance ?? 0, defaultCurrency), defaultCurrency)
      );
      setColor(editing.color);
      const icon = ACCOUNT_ICON_PRESETS.find((p) => p.key === editing.icon_key) ?? ACCOUNT_ICON_PRESETS[0];
      setSelectedIcon(icon);
    } else {
      setName("");
      setInitialBalance("");
      setColor(COLOR_OPTIONS[0]);
      setSelectedIcon(ACCOUNT_ICON_PRESETS[0]);
    }
  }, [visible, editing, currencyReady, defaultCurrency]);

  const save = async () => {
    if (!name.trim()) {
      setError("Ingresá un nombre");
      return;
    }
    const parsed = parseAmountInput(initialBalance);
    const balance = parsed !== null ? convertToBase(parsed, entryCurrency) : 0;
    setSaving(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        icon_key: selectedIcon.key,
        color,
        initial_balance: balance,
      };
      if (editing) {
        await updateAccount(editing.id, data);
      } else {
        await createAccount(data);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{editing ? "Editar cuenta" : "Nueva cuenta"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.section}>Saldo inicial</Text>
            <AmountWithCurrency
              amount={initialBalance}
              currency={entryCurrency}
              onAmountChange={setInitialBalance}
              onCurrencyChange={setEntryCurrency}
              inputPlaceholder="Saldo inicial"
            />
            <Text style={styles.section}>Color</Text>
            <View style={styles.colors}>
              {COLOR_OPTIONS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
            <Text style={styles.section}>Icono</Text>
            <IconPickerGrid
              icons={ACCOUNT_ICON_PRESETS}
              selectedKey={selectedIcon.key}
              onSelect={(icon) => {
                setSelectedIcon(icon);
                if (icon.color) setColor(icon.color);
              }}
              columns={5}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
              <Text style={styles.saveText}>{saving ? "..." : "Guardar"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    padding: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  section: { color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 2, borderColor: colors.text },
  error: { color: colors.danger, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, padding: 14, alignItems: "center" },
  cancelText: { color: colors.textSecondary },
  saveBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: "center" },
  saveText: { color: "#000", fontWeight: "700" },
});
