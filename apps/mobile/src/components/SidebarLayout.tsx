import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SidebarProvider,
} from "../contexts/SidebarContext";
import { useLocale } from "../contexts/LocaleContext";
import { useTheme } from "../contexts/ThemeContext";
import { getSidebarCollapsed, setSidebarCollapsed } from "../services/sidebar";
import { shape } from "../theme/shape";

const SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
  side?: "left" | "right";
};

export function SidebarLayout({ sidebar, children, side = "left" }: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const width = useSharedValue(SIDEBAR_EXPANDED_WIDTH);
  const isRight = side === "right";

  const progress = useDerivedValue(() => width.value / SIDEBAR_EXPANDED_WIDTH);

  useEffect(() => {
    getSidebarCollapsed()
      .then((value) => {
        setCollapsed(value);
        width.value = value ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
      })
      .finally(() => setReady(true));
  }, [width]);

  const persistCollapsed = useCallback((value: boolean) => {
    setCollapsed(value);
    setSidebarCollapsed(value).catch(console.warn);
  }, []);

  const collapse = useCallback(() => {
    if (collapsed) return;
    width.value = withSpring(SIDEBAR_COLLAPSED_WIDTH, SPRING);
    persistCollapsed(true);
  }, [collapsed, persistCollapsed, width]);

  const toggle = useCallback(() => {
    const next = !collapsed;
    const target = next ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
    width.value = withSpring(target, SPRING);
    persistCollapsed(next);
  }, [collapsed, persistCollapsed, width]);

  const sidebarStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const toggleIcon = isRight
    ? collapsed
      ? "chevron-left"
      : "chevron-right"
    : collapsed
      ? "chevron-right"
      : "chevron-left";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
        sidebarClip: {
          overflow: "hidden",
          backgroundColor: colors.surface,
        },
        sidebarLeft: {
          borderRightWidth: 1,
          borderRightColor: colors.border,
        },
        sidebarRight: {
          borderLeftWidth: 1,
          borderLeftColor: colors.border,
        },
        content: { flex: 1 },
        placeholder: {
          width: SIDEBAR_EXPANDED_WIDTH,
          backgroundColor: colors.surface,
        },
        placeholderLeft: {
          borderRightWidth: 1,
          borderRightColor: colors.border,
        },
        placeholderRight: {
          borderLeftWidth: 1,
          borderLeftColor: colors.border,
        },
        toggle: {
          position: "absolute",
          zIndex: 20,
          width: 32,
          height: 32,
          borderRadius: shape.full,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          elevation: 3,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
        },
      }),
    [colors]
  );

  const sidebarPanel = (
    <Animated.View
      style={[
        styles.sidebarClip,
        isRight ? styles.sidebarRight : styles.sidebarLeft,
        sidebarStyle,
      ]}
    >
      {sidebar}
    </Animated.View>
  );

  if (!ready) {
    return (
      <View style={styles.root}>
        {isRight ? (
          <>
            <View style={styles.content}>{children}</View>
            <View style={[styles.placeholder, isRight ? styles.placeholderRight : styles.placeholderLeft]} />
          </>
        ) : (
          <>
            <View style={[styles.placeholder, styles.placeholderLeft]} />
            <View style={styles.content}>{children}</View>
          </>
        )}
      </View>
    );
  }

  return (
    <SidebarProvider value={{ ready, collapsed, progress, toggle, collapse }}>
      <View style={styles.root}>
        {isRight ? (
          <>
            <View style={styles.content}>{children}</View>
            {sidebarPanel}
          </>
        ) : (
          <>
            {sidebarPanel}
            <View style={styles.content}>{children}</View>
          </>
        )}
        <View
          style={[
            styles.toggle,
            isRight ? { right: 8 } : { left: 8 },
            { top: insets.top + 10 },
          ]}
        >
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
            hitSlop={8}
            style={{ alignItems: "center", justifyContent: "center", width: 32, height: 32 }}
          >
            <MaterialCommunityIcons name={toggleIcon} size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </SidebarProvider>
  );
}
