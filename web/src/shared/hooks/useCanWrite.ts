import axios from 'axios';
import { useEffect, useState } from 'react';
import { fetchMe } from '@/services/auth';

/**
 * 业务写权限：仅启用中的 admin。
 * viewer 只读（可导出由各页自行保留）。
 */
export function useCanWrite(): boolean {
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchMe(controller.signal)
      .then((me) => {
        if (!controller.signal.aborted) {
          setCanWrite(me.role === 'admin' && me.enabled);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        if (!controller.signal.aborted) setCanWrite(false);
      });
    return () => {
      controller.abort();
    };
  }, []);

  return canWrite;
}
