import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { fetchServices, Service } from "../../lib/api";

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => { fetchServices().then(setServices).catch(e => setErr(e.message)); }, []);
  if (err) return <Text style={{ padding: 16, color: "crimson" }}>{err}</Text>;
  if (!services) return <ActivityIndicator style={{ marginTop: 32 }} />;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>בחרי שירות · Choose a service</Text>
      {services.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => router.push({ pathname: "/(booking)/date", params: { serviceId: String(s.id) } })}
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
