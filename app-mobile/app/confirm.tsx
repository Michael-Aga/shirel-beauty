import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { bookAppointment, fetchServices, rescheduleAppointment, Service } from "../lib/api";

// ---------- helpers for IL phone (after +972) ----------
const onlyDigits = (s: string) => s.replace(/\D/g, "");
const normalizeILDigits = (raw: string) => {
  const d = onlyDigits(raw);
  // drop any leading zeros (e.g., "052..." -> "52...")
  const noLeadingZero = d.replace(/^0+/, "");
  return noLeadingZero.slice(0, 9); // cap to 9 digits
};
const isValidILDigits = (digits: string) => /^\d{9}$/.test(digits);
const toWhatsappE164 = (digits: string) => `whatsapp:+972${digits}`;
// -------------------------------------------------------

export default function ConfirmScreen() {
  const { serviceId, start_iso, label, date, apptId } = useLocalSearchParams<{
    serviceId: string; start_iso: string; label: string; date: string; apptId?: string;
  }>();
  const router = useRouter();
  const [svc, setSvc] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState(""); // 9 digits after +972 only

  const isReschedule = !!apptId;

  useEffect(() => {
    fetchServices()
      .then(list => setSvc(list.find(s => String(s.id) === String(serviceId)) || null))
      .catch(() => {});
  }, [serviceId]);

  const trimmedName = name.trim();
  const isNameValid = (() => {
    if (!trimmedName) return false;
    const parts = trimmedName.split(/\s+/);
    return parts.length >= 2 && trimmedName.length >= 5; // at least first + last
  })();
  const isPhoneValid = isValidILDigits(phoneDigits);
  const canSubmit = isReschedule || (isNameValid && isPhoneValid);

  async function onConfirm() {
    if (!svc || !start_iso) return;
    try {
      if (isReschedule) {
        await rescheduleAppointment(Number(apptId), String(start_iso));
        Alert.alert("עודכן!", "התור הועבר בהצלחה", [{ text: "סגור", onPress: () => router.replace("/admin") }]);
      } else {
        if (!isNameValid || !isPhoneValid) {
          Alert.alert("חסר/שגוי", "נא להזין שם מלא ומספר טלפון של 9 ספרות לאחר +972");
          return;
        }

        const phoneForApi = toWhatsappE164(phoneDigits);

        await bookAppointment({
          service_id: Number(serviceId),
          start_iso: String(start_iso),
          client_name: trimmedName,
          client_phone: phoneForApi, // whatsapp:+972XXXXXXXXX
        });
        Alert.alert("נקבע!", "התור נשמר בהצלחה", [{ text: "סגור", onPress: () => router.replace("/") }]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Network error";
      Alert.alert("שגיאה", msg);
    }
  }

  const disabled = !canSubmit;

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
            {/* Full name */}
            <TextInput
              placeholder="שם מלא / Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              style={{
                borderWidth: 1,
                borderColor: isNameValid || !name ? "#ddd" : "red",
                borderRadius: 12,
                padding: 12,
              }}
            />
            {!isNameValid && name.length > 0 && (
              <Text style={{ color: "red" }}>נא להזין שם פרטי ומשפחה</Text>
            )}

            {/* Phone: 9 digits after +972 */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16, paddingVertical: 12 }}>+972</Text>
              <TextInput
                placeholder="5XXXXXXXX"
                keyboardType="number-pad"
                value={phoneDigits}
                onChangeText={(t) => setPhoneDigits(normalizeILDigits(t))}
                maxLength={9}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: isPhoneValid || !phoneDigits ? "#ddd" : "red",
                  borderRadius: 12,
                  padding: 12,
                }}
              />
            </View>
            {!isPhoneValid && phoneDigits.length > 0 && (
              <Text style={{ color: "red" }}>יש להזין 9 ספרות לאחר +972</Text>
            )}
          </>
        )}

        <Pressable
          onPress={onConfirm}
          disabled={disabled}
          style={({ pressed }) => ({
            backgroundColor: disabled ? "#9CA3AF" : pressed ? "#111827" : "#000",
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

