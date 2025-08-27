import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { IL_PREFIX, toILDigits, isValidILDigits } from '../utils/phone';

type Props = {
  value: string;                 // the 9 digits after +972
  onChange: (digits9: string) => void;
  label?: string;
};

export default function PhoneInputIL({ value, onChange, label = 'Phone' }: Props) {
  const valid = isValidILDigits(value);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8 }}>
          <Text>{IL_PREFIX}</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(toILDigits(t))}
          placeholder="5XXXXXXXX"
          keyboardType="number-pad"
          maxLength={9}
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 12 }}
        />
      </View>
      <Text style={{ color: valid ? 'green' : 'red' }}>{value.length}/9 digits</Text>
    </View>
  );
}

