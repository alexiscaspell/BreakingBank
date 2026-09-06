const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SERVICE_NAME = ".notifications.BankNotificationListenerService";

const LISTENER_JAVA = `package com.breakingbank.app.notifications;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BankNotificationListenerService extends NotificationListenerService {
  private static final String TAG = "BBBankNotif";
  private static final String PREFS = "breakingbank_integrations";
  private static final Set<String> ALLOWED = new HashSet<>(Arrays.asList(
      "com.mercadopago.wallet",
      "ar.com.santander.rio.mbanking",
      "ar.bapro"
  ));
  private final ExecutorService executor = Executors.newSingleThreadExecutor();

  @Override
  public void onNotificationPosted(StatusBarNotification sbn) {
    if (sbn == null) return;
    String pkg = sbn.getPackageName();
    if (pkg == null || !ALLOWED.contains(pkg)) return;

    SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    if (!prefs.getBoolean("enabled", false)) return;
    String token = prefs.getString("token", null);
    String apiUrl = prefs.getString("api_url", null);
    if (token == null || token.isEmpty() || apiUrl == null || apiUrl.isEmpty()) return;

    Bundle extras = sbn.getNotification() != null ? sbn.getNotification().extras : null;
    String title = extras != null ? String.valueOf(extras.getCharSequence("android.title", "")) : "";
    String text = extras != null ? String.valueOf(extras.getCharSequence("android.text", "")) : "";
    if ("null".equals(title)) title = "";
    if ("null".equals(text)) text = "";
    if (title.isEmpty() && text.isEmpty()) return;

    final String fTitle = title;
    final String fText = text;
    final String fPkg = pkg;
    final String fToken = token;
    final String fApi = apiUrl.endsWith("/") ? apiUrl.substring(0, apiUrl.length() - 1) : apiUrl;
    final String postedAt = Instant.ofEpochMilli(sbn.getPostTime()).toString();

    executor.execute(() -> postNotification(fApi, fToken, fPkg, fTitle, fText, postedAt));
  }

  private void postNotification(String apiUrl, String token, String pkg, String title, String text, String postedAt) {
    HttpURLConnection conn = null;
    try {
      JSONObject body = new JSONObject();
      body.put("android_package", pkg);
      body.put("title", title);
      body.put("text", text);
      body.put("posted_at", postedAt);

      URL url = new URL(apiUrl + "/integrations/ingest/notification");
      conn = (HttpURLConnection) url.openConnection();
      conn.setConnectTimeout(15000);
      conn.setReadTimeout(15000);
      conn.setRequestMethod("POST");
      conn.setDoOutput(true);
      conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
      conn.setRequestProperty("X-Integration-Token", token);

      byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
      conn.setFixedLengthStreamingMode(bytes.length);
      try (OutputStream os = conn.getOutputStream()) {
        os.write(bytes);
      }
      int code = conn.getResponseCode();
      Log.i(TAG, "ingest status=" + code + " pkg=" + pkg);
    } catch (Exception e) {
      Log.e(TAG, "ingest failed", e);
    } finally {
      if (conn != null) conn.disconnect();
    }
  }

  @Override
  public void onDestroy() {
    executor.shutdownNow();
    super.onDestroy();
  }
}
`;

const MODULE_JAVA = `package com.breakingbank.app.notifications;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class BankNotificationsModule extends ReactContextBaseJavaModule {
  private static final String PREFS = "breakingbank_integrations";

  public BankNotificationsModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "BankNotifications";
  }

  @ReactMethod
  public void configure(String apiUrl, String token, boolean enabled, Promise promise) {
    try {
      SharedPreferences prefs = getReactApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      prefs.edit()
          .putString("api_url", apiUrl)
          .putString("token", token)
          .putBoolean("enabled", enabled)
          .apply();
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("config_error", e);
    }
  }

  @ReactMethod
  public void openListenerSettings(Promise promise) {
    try {
      Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getReactApplicationContext().startActivity(intent);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("settings_error", e);
    }
  }

  @ReactMethod
  public void isListenerEnabled(Promise promise) {
    try {
      Context ctx = getReactApplicationContext();
      String flat = Settings.Secure.getString(ctx.getContentResolver(), "enabled_notification_listeners");
      if (flat == null || flat.isEmpty()) {
        promise.resolve(false);
        return;
      }
      String pkg = ctx.getPackageName();
      for (String name : flat.split(":")) {
        ComponentName cn = ComponentName.unflattenFromString(name);
        if (cn != null && pkg.equals(cn.getPackageName())) {
          promise.resolve(true);
          return;
        }
      }
      promise.resolve(false);
    } catch (Exception e) {
      promise.reject("check_error", e);
    }
  }
}
`;

const PACKAGE_JAVA = `package com.breakingbank.app.notifications;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BankNotificationsPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new BankNotificationsModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;

function ensureJavaFiles(projectRoot) {
  const base = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    "com",
    "breakingbank",
    "app",
    "notifications"
  );
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, "BankNotificationListenerService.java"), LISTENER_JAVA);
  fs.writeFileSync(path.join(base, "BankNotificationsModule.java"), MODULE_JAVA);
  fs.writeFileSync(path.join(base, "BankNotificationsPackage.java"), PACKAGE_JAVA);
}

function withBankNotificationListener(config) {
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    if (!app.service) app.service = [];
    const exists = app.service.some((s) => s.$?.["android:name"] === SERVICE_NAME);
    if (!exists) {
      app.service.push({
        $: {
          "android:name": SERVICE_NAME,
          "android:exported": "true",
          "android:permission": "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.service.notification.NotificationListenerService",
                },
              },
            ],
          },
        ],
      });
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      ensureJavaFiles(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes("BankNotificationsPackage")) {
      if (!contents.includes("com.breakingbank.app.notifications.BankNotificationsPackage")) {
        contents = contents.replace(
          /package com\.breakingbank\.app(\s|;)/,
          (m) => `${m}\nimport com.breakingbank.app.notifications.BankNotificationsPackage\n`
        );
      }
      if (contents.includes("PackageList(this).packages.apply")) {
        contents = contents.replace(
          /PackageList\(this\)\.packages\.apply\s*\{/,
          "PackageList(this).packages.apply {\n              add(BankNotificationsPackage())"
        );
      } else if (contents.includes("getPackages()")) {
        contents = contents.replace(
          /List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);/,
          "List<ReactPackage> packages = new PackageList(this).getPackages();\n              packages.add(new BankNotificationsPackage());"
        );
      }
      cfg.modResults.contents = contents;
    }
    return cfg;
  });

  return config;
}

module.exports = withBankNotificationListener;
