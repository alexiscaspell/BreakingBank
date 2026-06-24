import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CATEGORY_ICON_PRESETS, COLOR_OPTIONS } from "../constants/presetIcons";
import { createCategory, updateCategory, usesOfflineStore, type Category } from "../data";
import { IconPickerGrid } from "./IconPickerGrid";
import { colors } from "../theme/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Category | null;
  defaultType?: "expense" | "income";
};

type IconMode = "preset" | "url" | "upload";

export function CategoryFormModal({ visible, onClose, onSaved, editing, defaultType = "expense" }: Props) {
  const [name, setName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [iconMode, setIconMode] = useState<IconMode>("preset");
  const [selectedPreset, setSelectedPreset] = useState(CATEGORY_ICON_PRESETS[0]);
  const [iconUrl, setIconUrl] = useState("");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setCatType(editing.type as "expense" | "income");
      setColor(editing.color);
      if (editing.icon_type === "url") {
        setIconMode("url");
        setIconUrl(editing.icon_storage_key ?? "");
      } else if (editing.icon_type === "custom") {
        setIconMode(editing.icon_local_uri ? "upload" : "upload");
        setLocalUri(editing.icon_local_uri ?? null);
      } else {
        setIconMode("preset");
        const preset = CATEGORY_ICON_PRESETS.find((p) => p.key === editing.icon_key) ?? CATEGORY_ICON_PRESETS[0];
        setSelectedPreset(preset);
      }
    } else {
      setName("");
      setCatType(defaultType);
      setColor(COLOR_OPTIONS[0]);
      setIconMode("preset");
      setSelectedPreset(CATEGORY_ICON_PRESETS[0]);
      setIconUrl("");
      setLocalUri(null);
    }
  }, [visible, editing, defaultType]);

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!r.canceled) {
      setLocalUri(r.assets[0].uri);
      setIconMode("upload");
    }
  };

  const buildPayload = async () => {
    const base = { name: name.trim(), type: catType, color };
    if (iconMode === "preset") {
      return {
        ...base,
        icon_type: "preset",
        icon_key: selectedPreset.key,
        icon_storage_key: null,
      };
    }
    if (iconMode === "url") {
      const url = iconUrl.trim();
      if (!url.startsWith("http")) throw new Error("La URL debe empezar con http:// o https://");
      return { ...base, icon_type: "url", icon_key: null, icon_storage_key: url };
    }
    if (!localUri) throw new Error("Seleccioná una imagen");
    if (usesOfflineStore()) {
      return {
        ...base,
        icon_type: "custom",
        icon_local_uri: localUri,
      };
    }
    const { apiForm } = await import("../api/client");
    const form = new FormData();
    form.append("file", { uri: localUri, name: "icon.jpg", type: "image/jpeg" } as unknown as Blob);
    const { storage_key } = await apiForm<{ storage_key: string }>("/files/icons", form);
    return { ...base, icon_type: "custom", icon_storage_key: storage_key };
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Ingresá un nombre");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = await buildPayload();
      if (editing) {
        await updateCategory(editing.id, payload);
      } else {
        await createCategory(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{editing ? "Editar categoría" : "Nueva categoría"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
            />
            <View style={styles.typeRow}>
              {(["expense", "income"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeBtn, catType === t && styles.typeBtnActive]}
                  onPress={() => setCatType(t)}
                >
                  <Text style={[styles.typeText, catType === t && styles.typeTextActive]}>
                    {t === "expense" ? "Gasto" : "Ingreso"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>Color</Text>
            <View style={styles.colors}>
              {COLOR_OPTIONS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
            <Text style={styles.section}>Icono</Text>
            <View style={styles.modeRow}>
              {(
                [
                  ["preset", "Presets"],
                  ["url", "URL"],
                  ["upload", "Imagen"],
                ] as const
              ).map(([m, label]) => (
                <Pressable
                  key={m}
                  style={[styles.modeBtn, iconMode === m && styles.modeBtnActive]}
                  onPress={() => setIconMode(m)}
                >
                  <Text style={styles.modeText}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {iconMode === "preset" && (
              <IconPickerGrid
                icons={CATEGORY_ICON_PRESETS}
                selectedKey={selectedPreset.key}
                searchable
                searchPlaceholder="Buscar icono…"
                onSelect={(icon) => {
                  setSelectedPreset(icon);
                  if (icon.color) setColor(icon.color);
                }}
              />
            )}
            {iconMode === "url" && (
              <TextInput
                style={styles.input}
                placeholder="https://ejemplo.com/icono.png"
                placeholderTextColor="#888"
                autoCapitalize="none"
                value={iconUrl}
                onChangeText={setIconUrl}
              />
            )}
            {iconMode === "upload" && (
              <Pressable style={styles.uploadBtn} onPress={pickImage}>
                <MaterialCommunityIcons name="image-plus" size={24} color={colors.text} />
                <Text style={styles.uploadText}>{localUri ? "Cambiar imagen" : "Elegir imagen"}</Text>
              </Pressable>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
              <Text style={styles.saveText}>{saving ? "..." : "Guardar"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "92%",
    padding: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeText: { color: colors.textSecondary, fontWeight: "600" },
  typeTextActive: { color: "#000" },
  section: { color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 2, borderColor: colors.text },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  modeBtnActive: { backgroundColor: colors.accent },
  modeText: { color: colors.text, fontSize: 13 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadText: { color: colors.text },
  error: { color: colors.danger, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, padding: 14, alignItems: "center" },
  cancelText: { color: colors.textSecondary },
  saveBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: "center" },
  saveText: { color: "#000", fontWeight: "700" },
});
