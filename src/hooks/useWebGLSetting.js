import { useState } from 'react';

const KEY = 'meeting-queuer.webgl-mode';

export default function useWebGLSetting() {
  const [mode, setModeState] = useState(() => localStorage.getItem(KEY) ?? 'auto');

  const setMode = (value) => {
    localStorage.setItem(KEY, value);
    setModeState(value);
  };

  return [mode, setMode];
}
