import { useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import { useLocale } from "../src/contexts/LocaleContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { Button } from "../src/components/material/Button";
import { DownloadApkButton } from "../src/components/DownloadApkButton";
import { signInWithGoogle, useGoogleWebAuth } from "../src/services/googleAuth";

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error";
}

export default function LoginScreen() {
  const { user, login, loginWithGoogle, register } = useAuth();
  const { colors } = useTheme();
  const { t } = useLocale();
  const [, , webGooglePrompt] = useGoogleWebAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: "center" },
        logo: { width: 280, height: 280, alignSelf: "center", marginBottom: 32 },
        input: {
          backgroundColor: colors.card,
          color: colors.text,
          borderRadius: 10,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        error: { color: colors.danger, marginBottom: 8, textAlign: "center" },
        link: { color: colors.accent, textAlign: "center", marginTop: 16 },
        dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
        divider: { flex: 1, height: 1, backgroundColor: colors.border },
        dividerText: { color: colors.textSecondary, fontSize: 13 },
      }),
    [colors]
  );

  if (user) {
    return <Redirect href="/(tabs)/" />;
  }

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isRegister) await register(email, username, password);
      else await login(email, password);
      router.replace("/(tabs)/");
    } catch (e: unknown) {
      const message = formatError(e);
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await signInWithGoogle(webGooglePrompt);
      await loginWithGoogle(idToken);
      router.replace("/(tabs)/");
    } catch (e: unknown) {
      const message = formatError(e);
      if (message === "CANCELLED") return;
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/icon.png")} style={styles.logo} resizeMode="contain" />
      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder={t("login.username")}
          placeholderTextColor={colors.inputPlaceholder}
          value={username}
          onChangeText={setUsername}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder={t("login.email")}
        placeholderTextColor={colors.inputPlaceholder}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={t("login.password")}
        placeholderTextColor={colors.inputPlaceholder}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={loading ? "..." : isRegister ? t("login.signUp") : t("login.signIn")}
        onPress={submit}
        disabled={loading}
        fullWidth
      />

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>{t("login.or")}</Text>
        <View style={styles.divider} />
      </View>

      <Button
        label={loading ? "..." : t("login.google")}
        variant="outlined"
        onPress={googleSignIn}
        disabled={loading || (Platform.OS === "web" && !webGooglePrompt)}
        fullWidth
      />

      <Pressable onPress={() => setIsRegister(!isRegister)} style={{ marginTop: 16 }}>
        <Text style={styles.link}>{isRegister ? t("login.hasAccount") : t("login.createAccount")}</Text>
      </Pressable>

      <DownloadApkButton style={{ marginTop: 24 }} />
    </View>
  );
}
