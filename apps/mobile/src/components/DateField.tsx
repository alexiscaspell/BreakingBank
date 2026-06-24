import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDisplayDate } from "../services/currency";
import { CalendarPickerModal } from "./CalendarPickerModal";
import { colors } from "../theme/colors";

type Props = {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
};

export function DateField({ value, onChange, label = "Fecha" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={styles.dateText}>{formatDisplayDate(value)}</Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </Pressable>
      <CalendarPickerModal
        visible={open}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 4 },
  label: { color: colors.textSecondary, marginTop: 12, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { color: colors.text, fontSize: 16, flex: 1 },
  calendarIcon: { fontSize: 20, marginLeft: 8 },
});
