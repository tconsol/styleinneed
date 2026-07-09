import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  edges?: boolean; // apply top safe-area inset
}

export default function Screen({ children, style, edges = true }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, edges && { paddingTop: insets.top }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
