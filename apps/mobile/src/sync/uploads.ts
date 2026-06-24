import * as FileSystem from "expo-file-system";

import { apiForm } from "../api/client";
import { getLocalDb } from "../db";
import { enqueueMutation } from "./queue";

export async function uploadPendingFiles(): Promise<void> {
  const db = await getLocalDb();

  const pendingIcons = await db.getAllAsync<{
    client_id: string;
    icon_local_uri: string;
    name: string;
    type: string;
    color: string;
    icon_type: string;
    icon_key: string | null;
    sort_order: number;
  }>(
    `SELECT client_id, icon_local_uri, name, type, color, icon_type, icon_key, sort_order
     FROM categories WHERE icon_sync_status = 'pending_upload' AND icon_local_uri IS NOT NULL`
  );

  for (const icon of pendingIcons) {
    try {
      const form = new FormData();
      form.append("file", {
        uri: icon.icon_local_uri,
        name: "icon.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
      const { storage_key } = await apiForm<{ storage_key: string }>("/files/icons", form);
      await db.runAsync(
        "UPDATE categories SET icon_storage_key = ?, icon_type = 'custom', icon_sync_status = 'synced' WHERE client_id = ?",
        storage_key,
        icon.client_id
      );
      await enqueueMutation({
        entity: "category",
        op: "update",
        client_id: icon.client_id,
        payload: {
          name: icon.name,
          type: icon.type,
          color: icon.color,
          icon_type: "custom",
          icon_key: icon.icon_key,
          icon_storage_key: storage_key,
          sort_order: icon.sort_order,
        },
      });
    } catch (e) {
      console.warn("Icon upload failed", e);
    }
  }

  const pendingAttachments = await db.getAllAsync<{
    id: string;
    client_id: string;
    transaction_id: string;
    local_uri: string;
  }>(
    "SELECT id, client_id, transaction_id, local_uri FROM attachments WHERE upload_status = 'pending' AND local_uri IS NOT NULL"
  );

  for (const att of pendingAttachments) {
    try {
      const info = await FileSystem.getInfoAsync(att.local_uri);
      if (!info.exists) {
        await db.runAsync("UPDATE attachments SET upload_status = 'failed' WHERE client_id = ?", att.client_id);
        continue;
      }
      const form = new FormData();
      form.append("file", {
        uri: att.local_uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
      await apiForm(`/files/attachments/${att.transaction_id}`, form);
      await db.runAsync("UPDATE attachments SET upload_status = 'uploaded' WHERE client_id = ?", att.client_id);
    } catch (e) {
      console.warn("Attachment upload failed", e);
    }
  }
}
