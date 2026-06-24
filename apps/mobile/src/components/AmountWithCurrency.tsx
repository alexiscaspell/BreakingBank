import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { sanitizeAmountInput } from "../utils/amountInput";
import {
  formatAmountInput,
  getCurrencyInfo,
  parseAmountInput,
  type CurrencyCode,
} from "../constants/currencies";
import { convertBetween } from "../services/currency";
import { useCurrency } from "../contexts/CurrencyContext";
import { CurrencyPickerModal } from "./CurrencyPickerModal";
import { colors } from "../theme/colors";

type Props = {
  amount: string;
  currency: CurrencyCode;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (code: CurrencyCode) => void;
  showInput?: boolean;
  inputPlaceholder?: string;
};

export function AmountWithCurrency({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  showInput = true,
  inputPlaceholder = "Monto",
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { setDefaultCurrency } = useCurrency();
  const info = getCurrencyInfo(currency);

  const selectCurrency = (code: CurrencyCode) => {
    const parsed = parseAmountInput(amount);
    if (parsed !== null && code !== currency) {
      const converted = convertBetween(parsed, currency, code);
      onAmountChange(formatAmountInput(converted, code));
    }
    onCurrencyChange(code);
    void setDefaultCurrency(code);
    setPickerOpen(false);
  };

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.amount}>{amount || "0"}</Text>
        <Pressable style={styles.currencyBtn} onPress={() => setPickerOpen(true)}>
          <Text style={styles.currency}>{currency}</Text>
          <Text style={styles.currencyHint}>{info.symbol}</Text>
        </Pressable>
      </View>
      {showInput && (
        <TextInput
          style={styles.input}
          placeholder={inputPlaceholder}
          placeholderTextColor="#666"
          keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
          inputMode="decimal"
          value={amount}
          onChangeText={(text) => onAmountChange(sanitizeAmountInput(text, info.decimals))}
        />
      )}
      <CurrencyPickerModal
        visible={pickerOpen}
        selected={currency}
        onSelect={selectCurrency}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  amount: { color: colors.accent, fontSize: 36, fontWeight: "700" },
  currencyBtn: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingBottom: 2,
  },
  currency: { color: colors.accent, fontSize: 20, fontWeight: "700" },
  currencyHint: { color: colors.textSecondary, fontSize: 14 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
});
