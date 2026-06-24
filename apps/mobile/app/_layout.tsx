import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/contexts/AuthContext";
import { CurrencyProvider } from "../src/contexts/CurrencyContext";
import { GroupProvider } from "../src/contexts/GroupContext";
import { SyncProvider } from "../src/contexts/SyncContext";
import { LocaleProvider } from "../src/contexts/LocaleContext";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { RecurringBootstrap } from "../src/components/RecurringBootstrap";

function RootStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-transaction" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-recurring" options={{ presentation: "modal" }} />
        <Stack.Screen name="recurring-confirm" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LocaleProvider>
            <ErrorBoundary>
              <AuthProvider>
                <GroupProvider>
                  <CurrencyProvider>
                    <SyncProvider>
                      <RecurringBootstrap />
                      <RootStack />
                    </SyncProvider>
                  </CurrencyProvider>
                </GroupProvider>
              </AuthProvider>
            </ErrorBoundary>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
