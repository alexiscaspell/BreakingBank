import { useMemo } from "react";
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { WebSidebar } from "../../src/components/WebSidebar";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function WebTabLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const { locale } = useLocale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
        content: { flex: 1 },
        loading: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <View style={styles.root}>
      <WebSidebar key={locale} />
      <View style={styles.content}>
        <Slot key={locale} />
      </View>
    </View>
  );
}
