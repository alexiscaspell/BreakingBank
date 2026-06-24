import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ACCOUNT_ICON_MAP } from "../../src/constants/presetIcons";
import { deleteAccount, listAccounts, type Account } from "../../src/data";
import { AccountFormModal } from "../../src/components/AccountFormModal";
import { Fab } from "../../src/components/Fab";
import { AppBar } from "../../src/components/material/AppBar";
import { Surface } from "../../src/components/material/Surface";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { confirmAsync } from "../../src/utils/confirm";
import { formatMoney } from "../../src/utils/format";
import { shape } from "../../src/theme/shape";

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { t, tf } = useLocale();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const load = useCallback(async () => setAccounts(await listAccounts()), []);
  useFocusEffect(useCallback(() => { load().catch(console.error); }, [load]));

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        card: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, padding: 16, gap: 12 },
        icon: { width: 48, height: 48, borderRadius: shape.md, alignItems: "center", justifyContent: "center" },
        name: { color: colors.text, fontSize: 16, fontWeight: "600" },
        meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
        balance: { color: colors.text, fontWeight: "700", fontSize: 15 },
      }),
    [colors]
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setModalOpen(true);
  };
  const remove = async (a: Account) => {
    if (!(await confirmAsync(t("accounts.deleteTitle"), tf("accounts.deleteMsg", { name: a.name })))) return;
    await deleteAccount(a.id);
    load();
  };

  return (
    <View style={styles.container}>
      <AppBar title={t("nav.accounts")} subtitle={formatMoney(total, true)} large />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {accounts.map((a) => {
          const iconName = ACCOUNT_ICON_MAP[a.icon_key] ?? "wallet";
          return (
            <Pressable key={a.id} onPress={() => openEdit(a)} onLongPress={() => remove(a)}>
              <Surface style={styles.card} radius={shape.lg}>
                <View style={[styles.icon, { backgroundColor: a.color }]}>
                  <MaterialCommunityIcons name={iconName} color="#fff" size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{a.name}</Text>
                  {a.initial_balance ? (
                    <Text style={styles.meta}>
                      {t("accounts.initialBalance")}: {formatMoney(a.initial_balance, true)}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.balance}>{formatMoney(a.balance, true)}</Text>
              </Surface>
            </Pressable>
          );
        })}
      </ScrollView>
      <Fab onPress={openCreate} />
      <AccountFormModal visible={modalOpen} editing={editing} onClose={() => setModalOpen(false)} onSaved={load} />
    </View>
  );
}
