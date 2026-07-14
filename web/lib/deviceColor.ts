import type { TranslationKey } from './i18n';
import type { DeviceColor } from './types';

export const DEVICE_COLORS: DeviceColor[] = ['blue', 'green', 'red', 'amber', 'purple'];

export const DEVICE_COLOR_BORDER_CLASSES: Record<DeviceColor, string> = {
  blue: 'border-blue-500 dark:border-blue-400',
  green: 'border-green-500 dark:border-green-400',
  red: 'border-red-500 dark:border-red-400',
  amber: 'border-amber-500 dark:border-amber-400',
  purple: 'border-purple-500 dark:border-purple-400',
};

export const DEVICE_COLOR_SWATCH_CLASSES: Record<DeviceColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
};

export const DEVICE_COLOR_LABEL_KEYS: Record<DeviceColor, TranslationKey> = {
  blue: 'color_blue',
  green: 'color_green',
  red: 'color_red',
  amber: 'color_amber',
  purple: 'color_purple',
};

export function isDeviceColor(value: string): value is DeviceColor {
  return (DEVICE_COLORS as string[]).includes(value);
}
