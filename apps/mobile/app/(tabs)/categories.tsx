import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppBar } from "../../src/components/material/AppBar";
import { useFocusEffect } from "expo-router";
import { deleteCategory, listCategories, type Category } from "../../src/data";
import { CategoryFormModal } from "../../src/components/CategoryFormModal";
import { CategoryIcon } from "../../src/components/CategoryIcon";
import { Fab } from "../../src/components/Fab";
import { TypeTabs } from "../../src/components/TypeTabs";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { confirmAsync } from "../../src/utils/confirm";

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { t, tf } = useLocale();
  const [filterType, setFilterType] = useState<"expense" | "income">("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setCategories(await listCategories(filterType));
  }, [filterType]);

  useFocusEffect(useCallback(() => { load().catch(console.error); }, [load]));

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setModalOpen(true);
  };

  const remove = async (cat: Category) => {
    const ok = await confirmAsync(t("categories.deleteTitle"), tf("categories.deleteMsg", { name: cat.name }));
    if (!ok) return;
    await deleteCategory(cat.id);
    load();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      borderRadius: 10,
    },
    rowName: { color: colors.text, fontSize: 16, fontWeight: "600" },
    rowType: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  });

  return (
    <View style={styles.container}>
      <AppBar title={t("more.categories")} showBack large />
      <TypeTabs value={filterType} onChange={setFilterType} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {categories.map((c) => (
          <Pressable key={c.id} style={styles.row} onPress={() => openEdit(c)} onLongPress={() => remove(c)}>
            <CategoryIcon
              iconType={c.icon_type}
              iconKey={c.icon_key}
              iconStorageKey={c.icon_storage_key}
              color={c.color}
              localUri={c.icon_local_uri}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{c.name}</Text>
              <Text style={styles.rowType}>
                {c.type === "expense" ? t("common.expenseShort") : t("common.incomeShort")}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Fab onPress={openCreate} />
      <CategoryFormModal
        visible={modalOpen}
        editing={editing}
        defaultType={filterType}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </View>
  );
}
