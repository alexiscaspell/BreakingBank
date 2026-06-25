import { useMemo } from "react";
import { Linking, StyleSheet, View, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "./material/Button";
import { LATEST_APK_DOWNLOAD_URL } from "../constants/releases";
import { useLocale } from "../contexts/LocaleContext";

type Props = {
  style?: ViewStyle;
  compact?: boolean;
};

export function DownloadApkButton({ style, compact }: Props) {
  const { t } = useLocale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { width: compact ? undefined : "100%" },
      }),
    [compact]
  );

  const download = () => {
    Linking.openURL(LATEST_APK_DOWNLOAD_URL).catch(console.error);
  };

  return (
    <View style={[styles.wrap, style]}>
      <Button
        label={t("downloadApk.label")}
        variant={compact ? "text" : "tonal"}
        onPress={download}
        fullWidth={!compact}
        icon={<MaterialCommunityIcons name="android" size={20} />}
      />
    </View>
  );
}
