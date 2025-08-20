// app-mobile/app/hours.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Switch, ActivityIndicator } from "react-native";
import { listOverrides, upsertOverride, deleteOverride, OverrideOut } from "../lib/api";

function pad(n: number) { return String(n).padStart(2, "0"); }
function ym(dateISO: string) { return dateISO.slice(0, 7); }

export default function HoursScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();

  // default to today if not provided by Admin
  const [dateISO, setDateISO] = useState<string>(() => (date ? String(date) : new Date().toISOString().slice(0,10)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthData, setMonthData] = useState<OverrideOut[] | null>(null);

  // form state
  const [isClosed, setIsClosed] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("22:00");
  const [hasExisting, setHasExisting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listOverrides(ym(dateISO));
      setMonthData(data);
    } catch (e) {
      Alert.alert("Error", "Failed to load overrides");
    } finally {
      setLoading(false);
    }
  }

  // when month or date changes, reload or map the day
  useEffect(() => { load(); }, [dateISO.slice(0,7)]);

  useEffect(() => {
    if (!monthData) return;
    const found = monthData.find(o => o.date === dateISO);
    if (found) {
      setHasExisting(true);
      setIsClosed(!!found.is_closed);
      setStartTime(found.start_time ?? "08:00");
      setEndTime(found.end_time ?? "22:00");
    } else {
      setHasExisting(false);
      setIsClosed(false);
      setStartTime("08:00");
      setEndTime("22:00");
    }
  }, [monthData, dateISO]);

  function addDays(n: number) {
    const d = new Date(dateISO);
    d.setDate(d.getDate() + n);
    setDateISO(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  }

  function validHHMM(s: string) {
    return /^\d{2}:\d{2}$/.test(s) && Number(s.slice(0,2)) < 24 && Number(s.slice(3,5)) < 60;
  }

  async function onSave() {
    if (!isClosed) {
      if (!validHHMM(startTime) || !validHHMM(endTime)) {
        Alert.alert("Invalid time", "Please use HH:MM (24h), e.g., 14:00");
        return;
      }
    }
    setSaving(true);
    try {
      await upsertOverride(dateISO, {
        is_closed: isClosed,
        start_time: isClosed ? null : startTime,
        end_time: isClosed ? null : endTime,
      });
      Alert.alert("Saved", "Day hours updated");
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!hasExisting) return;
    setSaving(true);
    try {
      await deleteOverride(dateISO);
      Alert.alert("Removed", "Override deleted; day uses default hours");
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !monthData) return <ActivityIndicator style={{ marginTop: 32 }} />;

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Day Hours — {dateISO}</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => addDays(-1)} style={{ padding: 10, borderWidth: 1, borderRadius: 10 }}>
          <Text>◀ Prev</Text>
        </Pressable>
        <Pressable onPress={() => setDateISO(new Date().toISOString().slice(0,10))}
          style={{ padding: 10, borderWidth: 1, borderRadius: 10 }}>
          <Text>Today</Text>
        </Pressable>
        <Pressable onPress={() => addDays(1)} style={{ padding: 10, borderWidth: 1, borderRadius: 10 }}>
          <Text>Next ▶</Text>
        </Pressable>
      </View>

      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ddd", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "700" }}>Closed</Text>
          <Switch value={isClosed} onValueChange={setIsClosed} />
        </View>

        {!isClosed && (
          <View style={{ gap: 10 }}>
            <View>
              <Text style={{ marginBottom: 6 }}>Start (HH:MM)</Text>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="14:00"
                inputMode="numeric"
                style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12 }}
              />
            </View>
            <View>
              <Text style={{ marginBottom: 6 }}>End (HH:MM)</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="22:00"
                inputMode="numeric"
                style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12 }}
              />
            </View>
            <Text style={{ color: "#6b7280" }}>
              Tip: Use 24h format. Example: 14:00–22:00 for afternoon-evening days.
            </Text>
          </View>
        )}

        <Pressable
          disabled={saving}
          onPress={onSave}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#111827" : "#000",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 4,
            opacity: saving ? 0.7 : 1,
          })}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>

        {hasExisting && (
          <Pressable
            disabled={saving}
            onPress={onDelete}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#f3f4f6" : "white",
              padding: 12,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#ddd",
              opacity: saving ? 0.7 : 1,
            })}
          >
            <Text style={{ color: "#dc2626", fontWeight: "700" }}>Delete Override</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#ddd",
          backgroundColor: pressed ? "#f3f4f6" : "white",
        })}
      >
        <Text>Back</Text>
      </Pressable>
    </View>
  );
}
