// app-mobile/app/date.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export default function DateScreen() {
  const { serviceId, apptId } = useLocalSearchParams<{ serviceId: string; apptId?: string }>();
  const router = useRouter();

  const today = new Date();
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => addDays(today, i)), []);
  const [selectedDateISO, setSelectedDateISO] = useState<string>(toISO(today));

  function goNext() {
    router.push({
      pathname: "/times",
      params: {
        serviceId: String(serviceId),
        date: selectedDateISO,
        ...(apptId ? { apptId: String(apptId) } : {}),
      },
    });
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>בחרי תאריך · Pick a date</Text>

      <FlatList
        data={days}
        keyExtractor={(d) => toISO(d)}
        numColumns={3}
        columnWrapperStyle={{ gap: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const iso = toISO(item);
          const selected = iso === selectedDateISO;
          const wd = item.toLocaleDateString(undefined, { weekday: "short" }); // e.g., Sun
          const dd = String(item.getDate()).padStart(2, "0");
          return (
            <Pressable
              onPress={() => setSelectedDateISO(iso)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected ? "#111827" : "#ddd",
                backgroundColor: pressed
                  ? selected
                    ? "#1f2937"
                    : "#f3f4f6"
                  : selected
                  ? "#111827"
                  : "white",
                alignItems: "center",
              })}
            >
              <Text style={{ color: selected ? "white" : "#6b7280" }}>{wd}</Text>
              <Text style={{ color: selected ? "white" : "#111827", fontWeight: "700" }}>{dd}</Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={goNext}
        style={({ pressed }) => ({
          padding: 16,
          borderRadius: 14,
          alignItems: "center",
          backgroundColor: pressed ? "#111827" : "#000",
          marginTop: 8,
        })}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Continue</Text>
      </Pressable>
    </View>
  );
}
