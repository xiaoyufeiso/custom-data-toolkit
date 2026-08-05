import { useEffect, useState } from 'react';
import { fetchMe } from '@/services/auth';

/**
 * 业务写权限：仅启用中的 admin。
 * viewer 只读（可导出由各页自行保留）。
 */
export function useCanWrite(): boolean {
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setCanWrite(me.role === 'admin' && me.enabled);
      })
      .catch(() => {
        if (!cancelled) setCanWrite(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return canWrite;
}
