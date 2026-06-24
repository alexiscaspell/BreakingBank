import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CURRENCIES, getCurrencyInfo, type CurrencyCode } from "../constants/currencies";
import { colors } from "../theme/colors";

type Props = {
  visible: boolean;
  selected: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
};

export function CurrencyPickerModal({ visible, selected, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Seleccionar moneda</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {CURRENCIES.map((c) => (
              <Pressable
                key={c.code}
                style={[styles.row, selected === c.code && styles.rowActive]}
                onPress={() => onSelect(c.code)}
              >
                <View>
                  <Text style={styles.code}>{c.code}</Text>
                  <Text style={styles.name}>{c.name}</Text>
                </View>
                <Text style={styles.symbol}>{getCurrencyInfo(c.code).symbol}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    padding: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowActive: { backgroundColor: colors.card },
  code: { color: colors.text, fontWeight: "700", fontSize: 16 },
  name: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  symbol: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  closeBtn: { marginTop: 8, padding: 14, alignItems: "center" },
  closeText: { color: colors.textSecondary },
});
