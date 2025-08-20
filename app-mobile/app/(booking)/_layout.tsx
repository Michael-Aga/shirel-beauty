import { Stack } from "expo-router";

export default function BookingLayout() {
  return (
    <Stack>
      <Stack.Screen name="index"  options={{ title: "Choose Service" }} />
      <Stack.Screen name="date"   options={{ title: "Pick Date" }} />
      <Stack.Screen name="times"  options={{ title: "Pick Time" }} />
      <Stack.Screen name="confirm" options={{ title: "Confirm" }} />
    </Stack>
  );
}
