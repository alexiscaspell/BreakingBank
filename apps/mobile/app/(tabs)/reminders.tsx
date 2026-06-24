import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppBar } from "../../src/components/material/AppBar";
import { useFocusEffect } from "expo-router";
import { deleteReminder, listReminders } from "../../src/data";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { getFormatLocaleTag } from "../../src/utils/format";

type Item = {
  id: string;
  title: string;
  due_at: string;
  notes: string | null;
  recurring_payment_id: string | null;
  completed_at: string | null;
};

export default function RemindersScreen() {
  const { colors } = useTheme();
  const { t, tf } = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  const load = useCallback(async () => {
    const all = await listReminders();
    setItems(all.filter((r) => !r.completed_at));
  }, []);
  useFocusEffect(useCallback(() => { load().catch(console.error); }, [load]));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        empty: { color: colors.textSecondary, textAlign: "center", marginTop: 40 },
        card: { backgroundColor: colors.card, borderRadius: 10, padding: 16, marginBottom: 8 },
        title: { color: colors.text, fontSize: 16, fontWeight: "700" },
        meta: { color: colors.textSecondary, marginTop: 4 },
        badge: { color: colors.accent, fontSize: 12, marginTop: 6 },
      }),
    [colors]
  );

  const open = (item: Item) => {
    if (item.recurring_payment_id) {
      router.push({ pathname: "/recurring-confirm", params: { reminderId: item.id } });
      return;
    }
  };

  const remove = (item: Item) => {
    Alert.alert(t("reminders.deleteTitle"), tf("reminders.deleteMsg", { name: item.title }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteReminder(item.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppBar title={t("more.reminders")} showBack large />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {items.length === 0 ? (
          <Text style={styles.empty}>{t("reminders.empty")}</Text>
        ) : (
          items.map((i) => (
            <Pressable
              key={i.id}
              style={styles.card}
              onPress={() => open(i)}
              onLongPress={() => remove(i)}
            >
              <Text style={styles.title}>{i.title}</Text>
              <Text style={styles.meta}>{new Date(i.due_at).toLocaleString(getFormatLocaleTag())}</Text>
              {i.recurring_payment_id ? <Text style={styles.badge}>{t("recurring.confirmTitle")}</Text> : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
