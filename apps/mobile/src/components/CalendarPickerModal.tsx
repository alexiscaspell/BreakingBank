import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { colors } from "../theme/colors";

type Props = {
  visible: boolean;
  value: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  title?: string;
};

export function CalendarPickerModal({ visible, value, onSelect, onClose, title = "Seleccionar fecha" }: Props) {
  const onDayPress = (day: DateData) => {
    onSelect(day.dateString);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Calendar
            current={value}
            onDayPress={onDayPress}
            enableSwipeMonths
            markedDates={{
              [value]: { selected: true, selectedColor: colors.accent },
            }}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.card,
              textSectionTitleColor: colors.textSecondary,
              dayTextColor: colors.text,
              todayTextColor: colors.accent,
              selectedDayBackgroundColor: colors.accent,
              selectedDayTextColor: "#000",
              monthTextColor: colors.text,
              arrowColor: colors.accent,
              textDisabledColor: colors.textSecondary,
            }}
          />
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 16 },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  closeBtn: { marginTop: 8, padding: 14, alignItems: "center" },
  closeText: { color: colors.textSecondary },
});
