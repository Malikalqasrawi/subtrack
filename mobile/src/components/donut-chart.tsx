import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { ringArcs } from '@/lib/charts';

interface Props {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  accessibilityLabel: string;
  /** Shown in the hole of the donut. */
  children?: ReactNode;
}

export function DonutChart({ segments, size = 132, thickness = 16, accessibilityLabel, children }: Props) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcs = ringArcs(
    segments.map((segment) => segment.value),
    circumference,
    3,
  );
  const ring = { cx: size / 2, cy: size / 2, r: radius, fill: 'none', strokeWidth: thickness };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Turned a quarter back so the first segment starts at the top. */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle {...ring} stroke={theme.surfaceAlt} />
          {segments.map((segment, index) => (
            <Circle
              key={index}
              {...ring}
              stroke={segment.color}
              strokeDasharray={`${arcs[index].length} ${circumference - arcs[index].length}`}
              strokeDashoffset={-arcs[index].offset}
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
