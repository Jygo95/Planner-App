import { useState, useEffect } from 'react';

export function useRigaTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return now;
}
