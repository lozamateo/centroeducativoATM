import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, institucion } from '../../../shared/theme';

// Logo institucional (el mismo de la web); si no carga, muestra el isotipo con el nombre.
export function Logo({ height = 48, light = false }: { height?: number; light?: boolean }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={s.fallback}>
        <View style={s.mark}><Ionicons name="school" size={20} color="#fff" /></View>
        <Text style={[s.text, light && { color: '#fff' }]}>
          <Text style={{ fontWeight: '800' }}>Educar</Text> para{'\n'}Transformar
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: institucion.logoUrl }}
      style={{ height, width: height * 3 }}
      resizeMode="contain"
      accessibilityLabel={institucion.nombre}
      onError={() => setError(true)}
    />
  );
}

const s = StyleSheet.create({
  fallback: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.primary, fontSize: 14, lineHeight: 16 },
});
