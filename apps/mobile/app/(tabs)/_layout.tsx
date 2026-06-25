import { useMemo } from "react";
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppSidebar } from "../../src/components/AppSidebar";
import { SidebarLayout } from "../../src/components/SidebarLayout";
import { useAuth } from "../../src/contexts/AuthContext";
import { useLocale } from "../../src/contexts/LocaleContext";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const { locale } = useLocale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
    <SidebarLayout side="right" sidebar={<AppSidebar key={locale} autoCollapseOnNavigate />}>
      <Slot key={locale} />
    </SidebarLayout>
  );
}
