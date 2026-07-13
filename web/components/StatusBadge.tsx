import { Badge } from '@/components/ui/badge';
import { statusLabel, statusText } from '@/lib/statusDisplay';
import type { Locale } from '@/lib/types';

export function StatusBadge({ status, locale, dataRole }: { status: string; locale: Locale; dataRole?: string }) {
  return (
    <Badge variant={statusLabel(status)} data-role={dataRole}>
      {statusText(status, locale)}
    </Badge>
  );
}
