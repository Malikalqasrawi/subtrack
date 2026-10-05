import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { linePaths, linePoints } from '@/lib/charts';

interface Props {
  points: { label: string; value: number }[];
  height?: number;
  accessibilityLabel: string;
}

const PADDING = 8;

/** A filled line across the card. Labels sit under the first point, the last one and every third in between. */
export function LineChart({ points, height = 120, accessibilityLabel }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const placed = linePoints(
    points.map((point) => point.value),
    width,
    height,
    PADDING,
  );
  const paths = linePaths(placed, height);
  const peak = points.reduce((highest, point, index) => (point.value > points[highest].value ? index : highest), 0);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.accent} stopOpacity={0.35} />
                <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={paths.area} fill="url(#fill)" />
            <Path d={paths.line} fill="none" stroke={theme.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={placed[peak].x} cy={placed[peak].y} r={4.5} fill={theme.surface} stroke={theme.accent} strokeWidth={2.5} />
          </Svg>
        )}
      </View>
      <View style={styles.labels}>
        {points.map((point, index) => (
          <Text key={index} style={[styles.label, { color: theme.textMuted }]}>
            {index % 3 === 0 || index === points.length - 1 ? point.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    paddingHorizontal: PADDING / 2,
    marginTop: Spacing.one,
  },
  label: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
  },
});
