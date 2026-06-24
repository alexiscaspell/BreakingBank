import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import {
  createReminder,
  listCategories,
  listRecurringPayments,
  listReminders,
  type RecurringPayment,
  type Reminder,
} from "../data";
import { anchorFromDateIso, type RecurringFrequency } from "./recurringSchedule";

const RECURRING_CHANNEL_ID = "recurring-payments";

export type RecurringReminderPayload = {
  recurring_id: string;
  type: string;
  amount: number;
  account_id: string;
  category_id: string;
  comment: string | null;
  label_ids: string[];
  due_date: string;
};

let notificationsReady = false;

export async function initRecurringNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(RECURRING_CHANNEL_ID, {
      name: "Recurring payments",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  notificationsReady = true;
}

export function registerRecurringNotificationListeners(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const reminderId = response.notification.request.content.data?.reminderId;
    if (reminderId && typeof reminderId === "string") {
      router.push({ pathname: "/recurring-confirm", params: { reminderId } });
    }
  });
  return () => sub.remove();
}

async function findPendingRecurringReminder(recurringId: string): Promise<Reminder | null> {
  const reminders = await listReminders();
  return (
    reminders.find((r) => r.recurring_payment_id === recurringId && !r.completed_at) ?? null
  );
}

async function buildReminderTitle(recurring: RecurringPayment): Promise<string> {
  const categories = await listCategories(recurring.type);
  const category = categories.find((c) => c.id === recurring.category_id);
  return category?.name ?? "Recurring payment";
}

function buildPayload(recurring: RecurringPayment, dueDate: string): string {
  const body: RecurringReminderPayload = {
    recurring_id: recurring.id,
    type: recurring.type,
    amount: recurring.amount,
    account_id: recurring.account_id,
    category_id: recurring.category_id,
    comment: recurring.comment,
    label_ids: recurring.label_ids,
    due_date: dueDate,
  };
  return JSON.stringify(body);
}

async function scheduleLocalNotification(reminder: Reminder, title: string): Promise<void> {
  if (Platform.OS === "web" || !notificationsReady) return;
  const due = new Date(reminder.due_at);
  const trigger =
    due.getTime() > Date.now()
      ? { type: Notifications.SchedulableTriggerInputTypes.DATE as const, date: due }
      : null;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: title,
      data: { reminderId: reminder.id },
    },
    trigger,
  });
}

export async function processDueRecurringPayments(): Promise<Reminder[]> {
  const recurring = await listRecurringPayments();
  const now = new Date();
  const created: Reminder[] = [];

  for (const item of recurring) {
    if (!item.active) continue;
    if (new Date(item.next_run_at) > now) continue;

    const existing = await findPendingRecurringReminder(item.id);
    if (existing) {
      created.push(existing);
      continue;
    }

    const dueDate = item.next_run_at.slice(0, 10);
    const title = await buildReminderTitle(item);
    const reminder = await createReminder({
      title,
      due_at: item.next_run_at,
      recurring_payment_id: item.id,
      payload: buildPayload(item, dueDate),
    });
    await scheduleLocalNotification(reminder, title);
    created.push(reminder);
  }

  return created;
}

export function parseRecurringPayload(payload: string | null): RecurringReminderPayload | null {
  if (!payload) return null;
  try {
    return JSON.parse(payload) as RecurringReminderPayload;
  } catch {
    return null;
  }
}

export function isoDateAtMorning(dateIso: string): string {
  const anchor = anchorFromDateIso(dateIso);
  return anchor.toISOString();
}

export type { RecurringFrequency };
