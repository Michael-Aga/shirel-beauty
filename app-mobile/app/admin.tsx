import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { useRouter } from "expo-router";
import { listAppointments, cancelAppointment, fetchServices, Service } from "../lib/api";
import { logout } from "../lib/auth";

function formatLocal(isoUtc: string) {
  const d = new Date(isoUtc);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminScreen() {
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchServices().then(setServices).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      setItems(await listAppointments(dateISO));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [dateISO]);

  const svcById = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);

  async function onCancel(id: number) {
    try {
      const res = await cancelAppointment(id);
      const penalty = res?.penalty_due || 0;
      Alert.alert("Cancelled", penalty > 0 ? `Client owes ₪${penalty} (policy).` : "Cancelled without fee.");
      load();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to cancel");
    }
  }

  function addDays(n: number) {
    const d = new Date(dateISO);
    d.setDate(d.getDate() + n);
    setDateISO(d.toISOString().slice(0, 10));
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      {/* Header with date + Logout */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Admin — {dateISO}</Text>
        <Pressable
          onPress={async () => {
            await logout();
            router.replace("/");
          }}
          style={({ pressed }) => ({
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#ddd",
            backgroundColor: pressed ? "#f3f4f6" : "white",
          })}
        >
          <Text style={{ fontWeight: "700" }}>Logout</Text>
        </Pressable>
      </View>

      {/* Day navigation + Edit Day Hours */}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Pressable onPress={() => addDays(-1)} style={{ padding: 10, borderWidth: 1, borderRadius: 10 }}>
          <Text>◀ Yesterday</Text>
        </Pressable>
        <Pressable
          onPress={() => setDateISO(new Date().toISOString().slice(0, 10))}
          style={{ padding: 10, borderWidth: 1, borderRadius: 10 }}
        >
          <Text>Today</Text>
        </Pressable>
        <Pressable onPress={() => addDays(1)} style={{ padding: 10, borderWidth: 1, borderRadius: 10 }}>
          <Text>Tomorrow ▶</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: "/hours", params: { date: dateISO } })}
          style={({ pressed }) => ({
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            backgroundColor: pressed ? "#111827" : "#000",
            marginLeft: "auto",
          })}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Edit Day Hours</Text>
        </Pressable>
      </View>

      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={items}
        keyExtractor={(x) => String(x.id)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ddd" }}>
            <Text style={{ fontWeight: "700" }}>
              {formatLocal(item.start_utc)} — {formatLocal(item.end_utc)} · {svcById[item.service_id]?.name || "Service"}
            </Text>
            <Text>
              {item.client_name} · {item.client_phone}
            </Text>
            <Text>Status: {item.status}</Text>

            {item.status === "confirmed" && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {/* Cancel */}
                <Pressable
                  onPress={() => onCancel(item.id)}
                  style={({ pressed }) => ({
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: pressed ? "#ef4444" : "#dc2626",
                    alignItems: "center",
                  })}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>Cancel</Text>
                </Pressable>

                {/* Reschedule → go to /date (choose any day), carry apptId */}
                <Pressable
                  onPress={() => {
                    router.push({
                      pathname: "/date",
                      params: {
                        serviceId: String(item.service_id),
                        apptId: String(item.id),
                      },
                    });
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: pressed ? "#111827" : "#000",
                    alignItems: "center",
                  })}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>Reschedule</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text>No appointments.</Text>}
      />
    </View>
  );
}
