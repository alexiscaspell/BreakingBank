import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "760898317345-flj067csob9df2orbf6jssr3eqs5pta7.apps.googleusercontent.com";

let configured = false;

function ensureNativeConfigured() {
  if (configured || Platform.OS === "web") return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
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
    throw e;
  }
}

export function useGoogleWebAuth() {
  return Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  });
}

export async function signInWithGoogleWeb(
  promptAsync: ReturnType<typeof Google.useIdTokenAuthRequest>[2]
): Promise<string> {
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

export async function signInWithGoogle(
  webPrompt?: ReturnType<typeof Google.useIdTokenAuthRequest>[2]
): Promise<string> {
  if (Platform.OS === "web") {
    if (!webPrompt) throw new Error("Web Google auth not ready");
    return signInWithGoogleWeb(webPrompt);
  }
  return signInWithGoogleNative();
}
