import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AppBar } from "../../src/components/material/AppBar";
import { Button } from "../../src/components/material/Button";
import { Surface } from "../../src/components/material/Surface";
import { shape } from "../../src/theme/shape";
import { useGroup } from "../../src/contexts/GroupContext";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import type { GroupMember } from "../../src/services/groups";

export default function GroupsScreen() {
  const { colors } = useTheme();
  const { t, tf } = useLocale();
  const { groups, activeGroup, setActiveGroup, createGroup, inviteMember, listMembers, refreshGroups } =
    useGroup();
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [creating, setCreating] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        section: { padding: 16 },
        sectionTitle: { color: colors.text, fontWeight: "700", fontSize: 14, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.6 },
        item: { padding: 16, marginBottom: 8 },
        itemActive: { borderColor: colors.accent, borderWidth: 2 },
        itemTitle: { color: colors.text, fontWeight: "600", fontSize: 16 },
        itemMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
        input: {
          backgroundColor: colors.surfaceVariant,
          color: colors.text,
          borderRadius: shape.md,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
        },
        memberLine: { color: colors.textSecondary, fontSize: 14, marginBottom: 6, paddingHorizontal: 16 },
      }),
    [colors]
  );

  useFocusEffect(
    useCallback(() => {
      refreshGroups().catch(console.error);
      if (activeGroup) {
        listMembers(activeGroup.id).then(setMembers).catch(console.error);
      }
    }, [activeGroup?.id, listMembers, refreshGroups])
  );

  const onCreate = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createGroup(name);
      setNewGroupName("");
      Alert.alert(t("groups.createdTitle"), tf("groups.createdMsg", { name }));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("groups.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const onInvite = async () => {
    if (!activeGroup) return;
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      await inviteMember(activeGroup.id, email);
      setInviteEmail("");
      const updated = await listMembers(activeGroup.id);
      setMembers(updated);
      Alert.alert(t("groups.inviteTitle"), tf("groups.inviteMsg", { email }));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("groups.inviteFailed"));
    }
  };

  return (
    <View style={styles.container}>
      <AppBar title={t("more.groups")} showBack large />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("groups.myGroups")}</Text>
          <Surface radius={shape.lg}>
            <FlatList
              data={groups}
              keyExtractor={(g) => g.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.item, activeGroup?.id === item.id && styles.itemActive]}
                  onPress={() => setActiveGroup(item.id).catch(console.error)}
                >
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.member_count} {t("common.members")} · {item.role}
                    {activeGroup?.id === item.id ? ` · ${t("common.active")}` : ""}
                  </Text>
                </Pressable>
              )}
            />
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("groups.createSection")}</Text>
          <Surface style={{ padding: 16 }} radius={shape.lg}>
            <TextInput
              style={styles.input}
              placeholder={t("groups.createPlaceholder")}
              placeholderTextColor={colors.inputPlaceholder}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <Button
              label={creating ? t("groups.creating") : t("groups.createBtn")}
              onPress={onCreate}
              disabled={creating}
              fullWidth
            />
          </Surface>
        </View>

        {activeGroup ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tf("groups.inviteSection", { name: activeGroup.name })}</Text>
            <Surface style={{ padding: 16 }} radius={shape.lg}>
              <TextInput
                style={styles.input}
                placeholder={t("groups.invitePlaceholder")}
                placeholderTextColor={colors.inputPlaceholder}
                autoCapitalize="none"
                keyboardType="email-address"
                value={inviteEmail}
                onChangeText={setInviteEmail}
              />
              <Button label={t("groups.inviteBtn")} onPress={onInvite} fullWidth />
              {members.map((m) => (
                <Text key={m.id} style={styles.memberLine}>
                  · {m.username} ({m.email}) — {m.role}
                </Text>
              ))}
            </Surface>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
