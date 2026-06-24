import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { formatMoney } from "../utils/format";

export type AccountOption = { id: string; name: string; balance: number };

type Props = {
  visible: boolean;
  accounts: AccountOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

export function AccountPickerModal({ visible, accounts, selectedId, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Seleccionar cuenta</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Pressable
              style={[styles.row, selectedId === null && styles.rowActive]}
              onPress={() => onSelect(null)}
            >
              <Text style={styles.name}>Todas las cuentas</Text>
              <Text style={styles.balance}>
                {formatMoney(accounts.reduce((s, a) => s + a.balance, 0), true)}
              </Text>
            </Pressable>
            {accounts.map((a) => (
              <Pressable
                key={a.id}
                style={[styles.row, selectedId === a.id && styles.rowActive]}
                onPress={() => onSelect(a.id)}
              >
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.balance}>{formatMoney(a.balance, true)}</Text>
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
  name: { color: colors.text, fontWeight: "600", fontSize: 16, flex: 1 },
  balance: { color: colors.accent, fontWeight: "600" },
  closeBtn: { marginTop: 8, padding: 14, alignItems: "center" },
  closeText: { color: colors.textSecondary },
});
