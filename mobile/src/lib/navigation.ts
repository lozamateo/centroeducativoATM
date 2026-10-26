import { colors } from '../../../shared/theme';

// Estilo comun de los encabezados (azul institucional, igual que la web).
export const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontWeight: '800' as const },
  contentStyle: { backgroundColor: colors.background },
  headerBackTitle: 'Volver',
};
