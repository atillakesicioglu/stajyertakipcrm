"use server";

import { revalidatePath } from "next/cache";
import type { Theme } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  DEFAULT_TASK_STATUS_CONFIG,
  type TaskStatusConfig,
  type BadgeVariant,
} from "@/lib/app-settings-defaults";
import { parseNotificationPrefsFromForm } from "@/lib/notification-prefs";

export type SettingsActionState = {
  ok: boolean;
  message?: string;
};

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return session;
}

const badgeSchema = z.enum(["info", "warning", "success", "danger", "muted"]);

export async function updateTheme(theme: Theme): Promise<void> {
  const session = await getSession();
  if (!session?.user) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { theme },
  });
}

export async function updateGeneralSettings(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireAdmin();

    const schema = z.object({
      companyName: z.string().min(1).max(100),
      language: z.string().min(2).max(10),
      timezone: z.string().min(1).max(64),
      dateFormat: z.string().min(1).max(64),
      weekStartDay: z.coerce.number().int().min(0).max(6),
      currency: z.string().min(1).max(10),
      reminderTime: z.string().regex(/^\d{2}:\d{2}$/),
      autoLogoutMinutes: z.coerce.number().int().min(5).max(480),
    });

    const parsed = schema.parse({
      companyName: formData.get("companyName"),
      language: formData.get("language"),
      timezone: formData.get("timezone"),
      dateFormat: formData.get("dateFormat"),
      weekStartDay: formData.get("weekStartDay"),
      currency: formData.get("currency"),
      reminderTime: formData.get("reminderTime"),
      autoLogoutMinutes: formData.get("autoLogoutMinutes"),
    });

    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: parsed,
      create: {
        id: "default",
        taskStatusConfig: DEFAULT_TASK_STATUS_CONFIG,
        ...parsed,
      },
    });

    revalidatePath("/ayarlar");
    revalidatePath("/", "layout");
    return { ok: true, message: "Genel ayarlar kaydedildi." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Kayıt başarısız.",
    };
  }
}

export async function updateNotificationSettings(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireAdmin();

    const data = parseNotificationPrefsFromForm(formData);

    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        taskStatusConfig: DEFAULT_TASK_STATUS_CONFIG,
        ...data,
      },
    });

    revalidatePath("/ayarlar");
    return { ok: true, message: "Bildirim ayarları kaydedildi." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Kayıt başarısız.",
    };
  }
}

export async function updateUserNotificationSettings(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new Error("Oturum bulunamadı.");
    }

    const data = parseNotificationPrefsFromForm(formData);

    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    revalidatePath("/ayarlar");
    return { ok: true, message: "Bildirim tercihleriniz kaydedildi." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Kayıt başarısız.",
    };
  }
}

function parseOptionalColor(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

export async function updateThemeColors(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireAdmin();

    const data = {
      primaryColor: parseOptionalColor(formData.get("primaryColor")),
      successColor: parseOptionalColor(formData.get("successColor")),
      warningColor: parseOptionalColor(formData.get("warningColor")),
      dangerColor: parseOptionalColor(formData.get("dangerColor")),
      infoColor: parseOptionalColor(formData.get("infoColor")),
      neutralColor: parseOptionalColor(formData.get("neutralColor")),
    };

    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        taskStatusConfig: DEFAULT_TASK_STATUS_CONFIG,
        ...data,
      },
    });

    revalidatePath("/ayarlar");
    revalidatePath("/", "layout");
    return { ok: true, message: "Tema renkleri kaydedildi." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Kayıt başarısız.",
    };
  }
}

export async function updateTaskStatusConfig(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireAdmin();

    const config: TaskStatusConfig = { ...DEFAULT_TASK_STATUS_CONFIG };

    for (const status of Object.keys(DEFAULT_TASK_STATUS_CONFIG)) {
      const label = formData.get(`label_${status}`);
      const badge = formData.get(`badge_${status}`);
      const order = formData.get(`order_${status}`);

      if (typeof label === "string" && label.trim()) {
        config[status as keyof TaskStatusConfig].label = label.trim();
      }
      const parsedBadge = badgeSchema.safeParse(badge);
      if (parsedBadge.success) {
        config[status as keyof TaskStatusConfig].badge =
          parsedBadge.data as BadgeVariant;
      }
      const orderNum = Number(order);
      if (!Number.isNaN(orderNum)) {
        config[status as keyof TaskStatusConfig].order = orderNum;
      }
    }

    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: { taskStatusConfig: config },
      create: {
        id: "default",
        taskStatusConfig: config,
      },
    });

    revalidatePath("/ayarlar");
    revalidatePath("/isler");
    revalidatePath("/gorevler");
    return { ok: true, message: "Görev durumları kaydedildi." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Kayıt başarısız.",
    };
  }
}

export async function updateFileUploadSettings(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireAdmin();

    const allowedRaw = formData.get("allowedFileTypes");
    const allowedFileTypes =
      typeof allowedRaw === "string"
        ? allowedRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : ["image/png", "image/jpeg", "image/webp"];

    const schema = z.object({
      maxFileSizeMb: z.coerce.number().int().min(1).max(50),
      maxStorageMb: z.coerce.number().int().min(10).max(10000),
      virusScanEnabled: z.boolean(),
    });

    const parsed = schema.parse({
      maxFileSizeMb: formData.get("maxFileSizeMb"),
      maxStorageMb: formData.get("maxStorageMb"),
      virusScanEnabled: formData.get("virusScanEnabled") === "on",
    });

    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        ...parsed,
        allowedFileTypes,
      },
      create: {
        id: "default",
        taskStatusConfig: DEFAULT_TASK_STATUS_CONFIG,
        ...parsed,
        allowedFileTypes,
      },
    });

    revalidatePath("/ayarlar");
    return { ok: true, message: "Dosya yükleme ayarları kaydedildi." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Kayıt başarısız.",
    };
  }
}
