import { listTelegramUsers } from "@/lib/supabase-telegram-users";

type TechnicianNameSource = string | null | undefined;

function addTechnicianName(names: Set<string>, value: TechnicianNameSource) {
  const name = value?.trim();

  if (name) {
    names.add(name);
  }
}

function addEnvTechnicians(names: Set<string>) {
  const entries = (process.env.TELEGRAM_TECHNICIANS || "").split(";");

  for (const entry of entries) {
    const [, technicianName, role = "technician"] = entry.split("|").map((part) => part.trim());

    if (role === "technician") {
      addTechnicianName(names, technicianName);
    }
  }
}

export async function getCrmTechnicianNames(existingNames: TechnicianNameSource[] = []) {
  const names = new Set<string>();

  for (const name of existingNames) {
    addTechnicianName(names, name);
  }

  addEnvTechnicians(names);

  try {
    const telegramUsers = await listTelegramUsers();

    if (telegramUsers.ready) {
      for (const user of telegramUsers.users) {
        if (user.is_active && user.role === "technician") {
          addTechnicianName(names, user.technician_name);
        }
      }
    }
  } catch {
    // Keep schedule pages usable even if technician access storage is not ready.
  }

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}
