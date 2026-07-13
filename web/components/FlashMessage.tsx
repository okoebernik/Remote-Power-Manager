'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashMessage as FlashMessageData } from '@/lib/flash';

export function FlashMessage({ flash }: { flash: FlashMessageData | null }) {
  useEffect(() => {
    if (!flash) return;
    if (flash.type === 'error') {
      toast.error(flash.message);
    } else {
      toast.success(flash.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash?.message, flash?.type]);

  return null;
}
