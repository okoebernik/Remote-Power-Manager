import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { DEVICE_COLORS, DEVICE_COLOR_LABEL_KEYS, DEVICE_COLOR_SWATCH_CLASSES } from '@/lib/deviceColor';
import type { DeviceColor, Locale } from '@/lib/types';

export function DeviceColorPicker({
  name,
  defaultValue,
  locale,
}: {
  name: string;
  defaultValue: DeviceColor;
  locale: Locale;
}) {
  return (
    <div className="flex gap-3">
      {DEVICE_COLORS.map((color) => {
        const label = t(locale, DEVICE_COLOR_LABEL_KEYS[color]);
        return (
          <label key={color} title={label} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={color}
              defaultChecked={defaultValue === color}
              aria-label={label}
              className="peer sr-only"
            />
            <span
              className={cn(
                'block size-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition ring-transparent peer-checked:ring-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                DEVICE_COLOR_SWATCH_CLASSES[color],
              )}
            />
          </label>
        );
      })}
    </div>
  );
}
