import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "760898317345-flj067csob9df2orbf6jssr3eqs5pta7.apps.googleusercontent.com";

/** Browser OAuth redirect baked into release APKs (add to Web client redirect URIs in Google Cloud). */
export const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "breakingbank",
  path: "oauthredirect",
  native: "com.breakingbank.app:/oauthredirect",
});

export type GooglePrompt = ReturnType<typeof useGoogleWebAuth>[2];

let configured = false;

function ensureNativeConfigured() {
  if (configured || Platform.OS === "web") return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

function mapGoogleError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("DEVELOPER_ERROR")) {
    throw new Error(
      "Google Sign-In is not configured for this APK signing key. Add the APK SHA-1 fingerprint to your Android OAuth client in Google Cloud Console."
    );
  }
  throw err instanceof Error ? err : new Error(message);
}

export async function signInWithGoogleNative(): Promise<string> {
  ensureNativeConfigured();
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  try {
    const result = await GoogleSignin.signIn();
    const idToken = result.data?.idToken;
    if (!idToken) throw new Error("Google no devolvió un token de sesión");
    return idToken;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("CANCELLED");
    }
    if (err.code === statusCodes.IN_PROGRESS) {
      throw new Error("Inicio de sesión en progreso");
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services no está disponible");
    }
    mapGoogleError(e);
  }
}

/** Browser-based Google OAuth (Web client ID). Works on Android without native SHA-1 setup. */
export function useGoogleWebAuth() {
  return Google.useAuthRequest(
    {
      clientId: WEB_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
      redirectUri: GOOGLE_REDIRECT_URI,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
    },
    { scheme: "breakingbank", path: "oauthredirect" }
  );
}

export async function signInWithGoogleWeb(promptAsync: GooglePrompt): Promise<string> {
  const result = await promptAsync();
  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("CANCELLED");
  }
  if (result.type !== "success") {
    throw new Error("No se pudo iniciar sesión con Google");
  }
  const idToken = result.params.id_token ?? result.authentication?.idToken;
  if (!idToken) throw new Error("Google no devolvió un token de sesión");
  return idToken;
}

export async function signInWithGoogle(webPrompt?: GooglePrompt): Promise<string> {
  // Android sideload builds use the debug keystore; browser OAuth avoids SHA-1 mismatch (DEVELOPER_ERROR).
  if (Platform.OS === "web" || Platform.OS === "android") {
    if (!webPrompt) throw new Error("Google auth not ready");
    return signInWithGoogleWeb(webPrompt);
  }
  return signInWithGoogleNative();
}
