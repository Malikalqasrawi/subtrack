import { StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeDay, urgencyOf } from '@/lib/format';

/** "Today", "Tomorrow" or "In 5 days", coloured by how soon the charge is. */
export function RenewalTag({ date }: { date: string }) {
  const theme = useTheme();
  const colors = {
    today: { color: theme.danger, backgroundColor: theme.dangerSoft },
    soon: { color: theme.warning, backgroundColor: theme.warningSoft },
    later: { color: theme.textSecondary, backgroundColor: theme.surfaceAlt },
  }[urgencyOf(date)];
  return <Text style={[styles.tag, colors]}>{relativeDay(date)}</Text>;
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
