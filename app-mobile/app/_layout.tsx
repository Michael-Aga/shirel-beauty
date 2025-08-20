// app-mobile/app/_layout.tsx
import { Stack } from "expo-router";
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Shirel Beauty" }} />
      <Stack.Screen name="date" options={{ title: "Pick Date" }} />
      <Stack.Screen name="times" options={{ title: "Pick Time" }} />
      <Stack.Screen name="confirm" options={{ title: "Confirm" }} />
    </Stack>
  );
}

