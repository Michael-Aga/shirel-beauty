import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { fetchServices, Service } from "../lib/api";
import { isAdmin } from "../lib/auth";

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchServices().then(setServices).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    isAdmin().then(setAdmin);
  }, []);

  if (err) return <Text style={{ padding: 16, color: "crimson" }}>{err}</Text>;
  if (!services) return <ActivityIndicator style={{ marginTop: 32 }} />;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
        בחרי שירות · Choose a service
      </Text>

      {/* Tiny admin link (top-right) */}
      <View style={{ position: "absolute", right: 16, top: 16 }}>
        <Pressable
          onPress={() => router.push(admin ? "/admin" : "/admin-login")}
          style={({ pressed }) => ({
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#ddd",
            backgroundColor: pressed ? "#f3f4f6" : "white",
          })}
        >
          <Text style={{ fontSize: 12, fontWeight: "700" }}>
            {admin ? "Admin" : "Login"}
          </Text>
        </Pressable>
      </View>

      {services.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => router.push({ pathname: "/date", params: { serviceId: String(s.id) } })}
          style={({ pressed }) => ({
            padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#ddd",
            backgroundColor: pressed ? "#f3f4f6" : "white",
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: "600" }}>{s.name}</Text>
          <Text style={{ color: "#555" }}>{s.duration_min} דק · ₪{s.price}</Text>
        </Pressable>
      ))}
    </View>
  );
}
