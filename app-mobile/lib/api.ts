// app-mobile/lib/api.ts
import axios from "axios";
import { Platform } from "react-native";

function resolveBaseURL() {
  // Prefer env everywhere if set (works great with Cloudflare tunnel)
  const env = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (env) return env;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname } = window.location; // http://localhost:8081
    return `${protocol}//${hostname}:8000`;         // -> http://localhost:8000
  }
  // Simulators / device defaults
  return Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
}

const baseURL = resolveBaseURL();
console.log("API baseURL =", baseURL);

export const api = axios.create({ baseURL, timeout: 10000 });

export type Service = { id: number; name: string; duration_min: number; price: number; active: boolean };
export type Slot = { start_iso: string; end_iso: string; label: string };

export type OverrideOut = {
  date: string;            // "YYYY-MM-DD"
  start_time?: string|null; // "HH:MM"
  end_time?: string|null;
  is_closed: boolean;
};

export type OverrideUpsert = {
  start_time?: string | null;
  end_time?: string | null;
  is_closed: boolean;
};

export async function listOverrides(month: string) {
  // month = "YYYY-MM"
  const { data } = await api.get<OverrideOut[]>(`/overrides`, { params: { month } });
  return data;
}

export async function upsertOverride(date: string, body: OverrideUpsert) {
  const { data } = await api.put<OverrideOut>(`/overrides/${date}`, body);
  return data;
}

export async function deleteOverride(date: string) {
  await api.delete(`/overrides/${date}`);
}

export async function fetchServices() {
  const { data } = await api.get<Service[]>("/services");
  return data;
}

export async function fetchAvailability(serviceId: number, dateISO: string) {
  const { data } = await api.get<{ slots: Slot[] }>("/availability", {
    params: { service_id: serviceId, date: dateISO },
  });
  return data.slots;
}

export async function bookAppointment(params: {
  service_id: number;
  start_iso: string;
  client_name: string;
  client_phone: string;
}) {
  const { data } = await api.post("/appointments", params);
  return data;
}

export async function listAppointments(dateISO: string) {
  const { data } = await api.get("/appointments", { params: { date: dateISO } });
  return data as Array<{
    id: number;
    service_id: number;
    client_name: string;
    client_phone: string;
    start_utc: string;
    end_utc: string;
    status: "confirmed" | "cancelled";
  }>;
}

export async function cancelAppointment(id: number) {
  const { data } = await api.patch(`/appointments/${id}`, { action: "cancel" });
  return data as { appointment: any; penalty_due?: number };
}

export async function rescheduleAppointment(id: number, new_start_iso: string) {
  const { data } = await api.patch(`/appointments/${id}`, {
    action: "reschedule",
    new_start_iso,
  });
  return data as { appointment: any };
}
