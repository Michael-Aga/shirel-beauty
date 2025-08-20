import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { loginWithPin } from "../lib/auth";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit() {
    setBusy(true);
    try {
      const ok = await loginWithPin(pin.trim());
      if (ok) {
        router.replace("/admin");
      } else {
        Alert.alert("Wrong PIN", "Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Admin Login</Text>
      <Text style={{ color: "#444" }}>
        Enter your PIN to access the admin dashboard.
      </Text>
      <TextInput
        value={pin}
        onChangeText={setPin}
        placeholder="PIN"
        secureTextEntry
        keyboardType="number-pad"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
          fontSize: 18,
          backgroundColor: "white",
        }}
      />
      <Pressable
        onPress={onSubmit}
        disabled={busy || !pin}
        style={({ pressed }) => ({
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          backgroundColor: pressed ? "#111827" : "#000",
          opacity: busy || !pin ? 0.6 : 1,
        })}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          {busy ? "Checking..." : "Login"}
        </Text>
      </Pressable>
    </View>
  );
}
