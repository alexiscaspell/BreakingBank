import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { ACCOUNT_ICON_MAP, PRESET_ICON_MAP } from "../constants/presetIcons";

type Props = {
  iconType: string;
  iconKey?: string | null;
  iconStorageKey?: string | null;
  color: string;
  size?: number;
  localUri?: string | null;
};

export function CategoryIcon({ iconType, iconKey, iconStorageKey, color, size = 48, localUri }: Props) {
  const presetName = PRESET_ICON_MAP[iconKey ?? "other"] ?? "help-circle";
  const accountName = ACCOUNT_ICON_MAP[iconKey ?? "wallet"];
  const iconName = iconType === "account" ? (accountName ?? "wallet") : presetName;
  const [uri, setUri] = useState<string | null>(localUri ?? null);

  useEffect(() => {
    if (localUri) {
      setUri(localUri);
      return;
    }
    if (iconType === "url" && iconStorageKey) {
      setUri(iconStorageKey);
      return;
    }
    if (iconType === "custom" && iconStorageKey?.startsWith("http")) {
      setUri(iconStorageKey);
      return;
    }
    if (iconType === "custom" && iconStorageKey) {
      api<{ url: string }>(`/files/${iconStorageKey}/url`)
        .then((r) => setUri(r.url))
        .catch(() => setUri(null));
      return;
    }
    setUri(null);
  }, [iconType, iconStorageKey, localUri]);

  const showImage = (iconType === "custom" || iconType === "url") && uri;
  const radius = size / 2;

  if (showImage) {
    return (
      <View style={[styles.imageWrap, { width: size, height: size, borderRadius: radius }]}>
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.circle, { backgroundColor: color, width: size, height: size, borderRadius: radius }]}>
      <MaterialCommunityIcons name={iconName} size={size * 0.5} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  imageWrap: { overflow: "hidden" },
});
