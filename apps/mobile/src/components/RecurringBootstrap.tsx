import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";

import { useAuth } from "../contexts/AuthContext";
import {
  initRecurringNotifications,
  processDueRecurringPayments,
  registerRecurringNotificationListeners,
} from "../services/recurringProcessor";

export function RecurringBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    initRecurringNotifications().catch(console.warn);
    const removeListener = registerRecurringNotificationListeners();
    const run = () => {
      processDueRecurringPayments()
        .then((pending) => {
          if (pending.length === 1) {
            router.push({ pathname: "/recurring-confirm", params: { reminderId: pending[0].id } });
          }
        })
        .catch(console.warn);
    };
    run();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    const interval = setInterval(run, 60 * 60 * 1000);
    return () => {
      removeListener();
      sub.remove();
      clearInterval(interval);
    };
  }, [user?.id]);

  return null;
}
