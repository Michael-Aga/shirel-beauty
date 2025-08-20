import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { bookAppointment, fetchServices, rescheduleAppointment, Service } from "../lib/api";

export default function ConfirmScreen() {
  const { serviceId, start_iso, label, date, apptId } = useLocalSearchParams<{
    serviceId: string; start_iso: string; label: string; date: string; apptId?: string;
  }>();
  const router = useRouter();
  const [svc, setSvc] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const isReschedule = !!apptId;

  useEffect(() => {
    fetchServices().then(list => {
      setSvc(list.find(s => String(s.id) === String(serviceId)) || null);
    }).catch(() => {});
  }, [serviceId]);

  async function onConfirm() {
    if (!svc || !start_iso) return;
    try {
      if (isReschedule) {
        await rescheduleAppointment(Number(apptId), String(start_iso));
        Alert.alert("עודכן!", "התור הועבר בהצלחה", [{ text: "סגור", onPress: () => router.replace("/admin") }]);
      } else {
        if (!name.trim() || !phone.trim()) {
          Alert.alert("חסר מידע", "נא למלא שם ומספר טלפון");
          return;
        }
        await bookAppointment({
          service_id: Number(serviceId),
          start_iso: String(start_iso),
          client_name: name.trim(),
          client_phone: phone.trim(),
        });
        Alert.alert("נקבע!", "התור נשמר בהצלחה", [{ text: "סגור", onPress: () => router.replace("/") }]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Network error";
      Alert.alert("שגיאה", msg);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          {isReschedule ? "העבר תור / Reschedule" : "אישור תור / Confirm"}
        </Text>
        <Text>שירות: {svc?.name}</Text>
        <Text>תאריך: {date}</Text>
        <Text>שעה: {label}</Text>

        {!isReschedule && (
          <>
            <TextInput placeholder="שם מלא / Full name" value={name} onChangeText={setName}
              style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }} />
            <TextInput placeholder="טלפון / Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone}
              style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }} />
          </>
        )}

        <Pressable onPress={onConfirm}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#111827" : "#000",
            padding: 16,
            borderRadius: 14,
            alignItems: "center",
            marginTop: 8,
          })}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {isReschedule ? "העבר תור / Reschedule" : "קבעי תור / Book"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
