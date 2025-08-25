import { Redirect } from "expo-router";

export default function BookingIndex() {
  // Group indexes should point somewhere real; send to home
  return <Redirect href="/" />;
}
