import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
  "760898317345-2srki8o0tj5ljd4eouglc8fdf58qvnmi.apps.googleusercontent.com";

/** Android OAuth redirect — register on the Android client in Google Cloud Console. */
export const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "breakingbank",
  path: "oauthredirect",
  native: "com.breakingbank.app:/oauthredirect",
});

export type GooglePrompt = ReturnType<typeof useGoogleAuth>[2];

let configured = false;

function ensureNativeConfigured() {
  if (configured || Platform.OS === "web") return;
  if (!WEB_CLIENT_ID) {
    throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required for iOS Google Sign-In");
  }
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

/** Platform-specific Google OAuth (Web client on web, Android client on Android). */
export function useGoogleAuth() {
  if (Platform.OS === "web") {
    return Google.useAuthRequest({
      clientId: WEB_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
    });
  }

  return Google.useAuthRequest(
    {
      androidClientId: ANDROID_CLIENT_ID,
      clientId: ANDROID_CLIENT_ID,
      redirectUri: GOOGLE_REDIRECT_URI,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
    },
    { scheme: "breakingbank", path: "oauthredirect" }
  );
}

export async function signInWithGoogleOAuth(promptAsync: GooglePrompt): Promise<string> {
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

export async function signInWithGoogle(prompt?: GooglePrompt): Promise<string> {
  if (Platform.OS === "web" || Platform.OS === "android") {
    if (!prompt) throw new Error("Google auth not ready");
    if (Platform.OS === "android" && !ANDROID_CLIENT_ID) {
      throw new Error("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is not configured");
    }
    if (Platform.OS === "web" && !WEB_CLIENT_ID) {
      throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured");
    }
    return signInWithGoogleOAuth(prompt);
  }
  return signInWithGoogleNative();
}

// Back-compat alias for login screen
export const useGoogleWebAuth = useGoogleAuth;
