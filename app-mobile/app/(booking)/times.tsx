import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { fetchAvailability, Slot } from "../../lib/api";

export default function TimesScreen() {
  const { serviceId, date } = useLocalSearchParams<{ serviceId: string; date: string }>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId || !date) return;
    setLoading(true);
    fetchAvailability(Number(serviceId), String(date))
      .then(setSlots)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [serviceId, date]);

  if (loading) return <ActivityIndicator style={{ marginTop: 32 }} />;
  if (err) return <Text style={{ padding: 16, color: "crimson" }}>{err}</Text>;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>בחרי שעה · Pick a time</Text>
      <FlatList
        data={slots}
        keyExtractor={(s) => s.start_iso}
        numColumns={3}
        columnWrapperStyle={{ gap: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => console.log("Selected slot:", item)}
            style={({ pressed }) => ({
              flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#ddd",
              alignItems: "center", backgroundColor: pressed ? "#f3f4f6" : "white",
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>{item.label}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text>No slots for this day.</Text>}
      />
    </View>
  );
}
