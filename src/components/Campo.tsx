import { Text, TextInput, View, type TextInputProps } from "react-native";

type Props = Omit<TextInputProps, "accessibilityLabel"> & { label: string };

export function Campo({ label, ...resto }: Props) {
  return (
    <View style={{ gap: 4 }}>
      <Text>{label}</Text>
      <TextInput accessibilityLabel={label} style={{ borderWidth: 1, padding: 8 }} {...resto} />
    </View>
  );
}
