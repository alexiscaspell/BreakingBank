import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { AppBar } from "../../src/components/material/AppBar";
import { Button } from "../../src/components/material/Button";
import { Surface } from "../../src/components/material/Surface";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { listAccounts, listCategories, type Account, type Category } from "../../src/data";
import {
  acceptPendingImport,
  createCounterpartyRule,
  deleteCounterpartyRule,
  dismissPendingImport,
  getIntegrationToken,
  listCounterpartyRules,
  listIntegrationSources,
  listPendingImports,
  updateIntegrationSource,
  type CounterpartyRule,
  type IntegrationSource,
  type PendingImport,
} from "../../src/api/integrations";
import { API_URL } from "../../src/api/client";
import {
  configureBankNotifications,
  isBankNotificationListenerEnabled,
  isBankNotificationsSupported,
  openBankNotificationSettings,
} from "../../src/services/bankNotifications";
import { syncNow } from "../../src/sync";
import { shape } from "../../src/theme/shape";

export default function IntegrationsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [sources, setSources] = useState<IntegrationSource[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CounterpartyRule[]>([]);
  const [pending, setPending] = useState<PendingImport[]>([]);
  const [token, setToken] = useState<string>("");
  const [listenerOn, setListenerOn] = useState(false);
  const [ruleType, setRuleType] = useState("alias");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleCategoryId, setRuleCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [src, acc, cats, rls, pend, tok] = await Promise.all([
      listIntegrationSources(),
      listAccounts(),
      listCategories(),
      listCounterpartyRules(),
      listPendingImports(),
      getIntegrationToken(),
    ]);
    setSources(src);
    setAccounts(acc);
    setCategories(cats);
    setRules(rls);
    setPending(pend);
    setToken(tok.token);
    if (!ruleCategoryId && cats.length) setRuleCategoryId(cats[0].id);
    if (isBankNotificationsSupported()) {
      setListenerOn(await isBankNotificationListenerEnabled());
      const anyEnabled = src.some((s) => s.enabled);
      await configureBankNotifications(API_URL, tok.token, anyEnabled);
    }
  }, [ruleCategoryId]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => Alert.alert(t("common.error"), String(e.message ?? e)));
    }, [load, t])
  );

  const accountName = useCallback(
    (id: string | null | undefined) => accounts.find((a) => a.id === id)?.name ?? t("integrations.noAccount"),
    [accounts, t]
  );
  const categoryName = useCallback(
    (id: string | null | undefined) => categories.find((c) => c.id === id)?.name ?? t("common.noCategory"),
    [categories, t]
  );

  const cycleAccount = async (src: IntegrationSource) => {
    if (!accounts.length) {
      Alert.alert(t("common.error"), t("integrations.needAccount"));
      return;
    }
    const idx = Math.max(0, accounts.findIndex((a) => a.id === src.default_account_id));
    const next = accounts[(idx + 1) % accounts.length];
    await updateIntegrationSource(src.id, { default_account_id: next.id });
    await load();
  };

  const toggleSource = async (src: IntegrationSource, enabled: boolean) => {
    setBusy(true);
    try {
      const accountId = src.default_account_id ?? accounts[0]?.id ?? null;
      if (enabled && !accountId) {
        Alert.alert(t("common.error"), t("integrations.needAccount"));
        return;
      }
      await updateIntegrationSource(src.id, {
        enabled,
        default_account_id: accountId,
      });
      const refreshed = await listIntegrationSources();
      setSources(refreshed);
      if (isBankNotificationsSupported() && token) {
        await configureBankNotifications(API_URL, token, refreshed.some((s) => s.enabled));
      }
    } finally {
      setBusy(false);
    }
  };

  const addRule = async () => {
    if (!ruleValue.trim() || !ruleCategoryId) return;
    setBusy(true);
    try {
      await createCounterpartyRule({
        match_type: ruleType,
        match_value: ruleValue.trim(),
        category_id: ruleCategoryId,
        transaction_type: "expense",
      });
      setRuleValue("");
      await load();
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const removeRule = async (rule: CounterpartyRule) => {
    await deleteCounterpartyRule(rule.id);
    await load();
  };

  const acceptItem = async (item: PendingImport, learn: boolean) => {
    setBusy(true);
    try {
      await acceptPendingImport(item.id, {
        account_id: item.suggested_account_id ?? accounts[0]?.id,
        category_id: item.suggested_category_id ?? categories[0]?.id,
        amount: item.amount ?? undefined,
        learn_rule: learn,
      });
      await syncNow().catch(console.error);
      await load();
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const dismissItem = async (item: PendingImport) => {
    await dismissPendingImport(item.id);
    await load();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        section: { marginHorizontal: 16, marginTop: 16 },
        label: {
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 8,
          marginLeft: 4,
        },
        card: { padding: 14, gap: 10 },
        row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
        title: { color: colors.text, fontSize: 16, fontWeight: "700" },
        sub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
        chip: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: colors.surfaceVariant,
        },
        chipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.text,
          backgroundColor: colors.card,
        },
        typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        typeChip: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
        },
        typeChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
        typeChipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
        typeChipTextOn: { color: colors.onAccent },
        item: {
          paddingVertical: 10,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          gap: 8,
        },
        actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        token: { color: colors.textSecondary, fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) },
      }),
    [colors]
  );

  const matchTypes = ["alias", "cbu", "cvu", "cuit", "contains"];

  return (
    <View style={styles.container}>
      <AppBar title={t("more.integrations")} showBack large />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <Text style={styles.label}>{t("integrations.capture")}</Text>
          <Surface style={styles.card} radius={shape.lg}>
            <Text style={styles.sub}>{t("integrations.captureHint")}</Text>
            {isBankNotificationsSupported() ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.title}>
                    {listenerOn ? t("integrations.listenerOn") : t("integrations.listenerOff")}
                  </Text>
                  <Button
                    label={t("integrations.openSettings")}
                    variant="tonal"
                    onPress={() => openBankNotificationSettings().then(() => load()).catch(console.error)}
                  />
                </View>
              </>
            ) : (
              <Text style={styles.sub}>{t("integrations.androidOnly")}</Text>
            )}
            <Text style={styles.token}>{token ? `${t("integrations.token")}: ${token.slice(0, 10)}…` : ""}</Text>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("integrations.sources")}</Text>
          <Surface style={styles.card} radius={shape.lg}>
            {sources.map((src) => (
              <View key={src.id} style={[styles.row, { marginBottom: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{src.display_name}</Text>
                  <Pressable onPress={() => cycleAccount(src).catch(console.error)}>
                    <Text style={styles.sub}>
                      {t("integrations.account")}: {accountName(src.default_account_id)} · {t("integrations.tapCycle")}
                    </Text>
                  </Pressable>
                </View>
                <Switch
                  value={src.enabled}
                  disabled={busy}
                  onValueChange={(v) => toggleSource(src, v).catch(console.error)}
                />
              </View>
            ))}
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("integrations.inbox")} ({pending.length})</Text>
          <Surface style={styles.card} radius={shape.lg}>
            {pending.length === 0 ? (
              <Text style={styles.sub}>{t("integrations.inboxEmpty")}</Text>
            ) : (
              pending.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.title}>
                    {item.source} · {item.amount != null ? `$${item.amount}` : "?"} · {item.direction}
                  </Text>
                  <Text style={styles.sub}>
                    {item.counterparty_name || item.counterparty_alias || item.comment || item.external_id}
                  </Text>
                  <Text style={styles.sub}>
                    {accountName(item.suggested_account_id)} → {categoryName(item.suggested_category_id)}
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      label={t("integrations.accept")}
                      variant="tonal"
                      onPress={() => acceptItem(item, false).catch(console.error)}
                    />
                    <Button
                      label={t("integrations.acceptLearn")}
                      variant="outlined"
                      onPress={() => acceptItem(item, true).catch(console.error)}
                    />
                    <Button
                      label={t("integrations.dismiss")}
                      variant="text"
                      onPress={() => dismissItem(item).catch(console.error)}
                    />
                  </View>
                </View>
              ))
            )}
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("integrations.rules")}</Text>
          <Surface style={styles.card} radius={shape.lg}>
            <View style={styles.typeRow}>
              {matchTypes.map((mt) => {
                const on = ruleType === mt;
                return (
                  <Pressable
                    key={mt}
                    style={[styles.typeChip, on && styles.typeChipOn]}
                    onPress={() => setRuleType(mt)}
                  >
                    <Text style={[styles.typeChipText, on && styles.typeChipTextOn]}>{mt}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={styles.input}
              placeholder={t("integrations.ruleValue")}
              placeholderTextColor={colors.textSecondary}
              value={ruleValue}
              onChangeText={setRuleValue}
              autoCapitalize="none"
            />
            <Pressable
              style={styles.chip}
              onPress={() => {
                if (!categories.length) return;
                const idx = Math.max(0, categories.findIndex((c) => c.id === ruleCategoryId));
                setRuleCategoryId(categories[(idx + 1) % categories.length].id);
              }}
            >
              <Text style={styles.chipText}>
                {t("integrations.category")}: {categoryName(ruleCategoryId)}
              </Text>
            </Pressable>
            <Button label={t("integrations.addRule")} variant="tonal" onPress={() => addRule()} fullWidth disabled={busy} />
            {rules.map((rule) => (
              <Pressable key={rule.id} style={styles.item} onLongPress={() => removeRule(rule).catch(console.error)}>
                <Text style={styles.title}>
                  {rule.match_type}: {rule.match_value}
                </Text>
                <Text style={styles.sub}>
                  {categoryName(rule.category_id)} · {rule.transaction_type} · {t("integrations.longPressDelete")}
                </Text>
              </Pressable>
            ))}
          </Surface>
        </View>
      </ScrollView>
    </View>
  );
}
