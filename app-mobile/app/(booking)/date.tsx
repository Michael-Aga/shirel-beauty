import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { Calendar, DateObject } from "react-native-calendars";
import dayjs from "dayjs";

export default function DateScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const router = useRouter();
  const today = dayjs().format("YYYY-MM-DD");
  const onDayPress = (d: DateObject) => {
    router.push({ pathname: "/(booking)/times", params: { serviceId, date: d.dateString } });
  };
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>בחרי תאריך · Pick a date</Text>
      <Calendar minDate={today} onDayPress={onDayPress} enableSwipeMonths />
    </View>
  );
}
