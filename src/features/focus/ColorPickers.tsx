import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ColorButton } from '@/ui/components/ColorButton';
import { useFocusStore } from './store';
import { useTheme } from '@/ui/theme';

export function ColorPickers() {
  useTheme(); // for theme context
  const mode = useFocusStore(s => s.mode);
  const innerColor = useFocusStore(s => s.innerColor);
  const outerColor = useFocusStore(s => s.outerColor);
  const setInnerColor = useFocusStore(s => s.setInnerColor);
  const setOuterColor = useFocusStore(s => s.setOuterColor);

  if (mode !== 'work') return null;

  return (
    <View style={styles.row}>
      <ColorButton
        label="İç Halka"
        value={innerColor}
        onChange={setInnerColor}
        accessibilityLabel="İç halka rengini seç"
      />
      <ColorButton
        label="Dış Halka"
        value={outerColor}
        onChange={setOuterColor}
        accessibilityLabel="Dış halka rengini seç"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
});