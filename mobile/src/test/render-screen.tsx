import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const SCREEN = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

export const renderScreen = (screen: ReactElement) => render(<SafeAreaProvider initialMetrics={SCREEN}>{screen}</SafeAreaProvider>);
