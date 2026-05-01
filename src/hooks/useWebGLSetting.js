import { useState } from 'react';
import { resolveWebGLEnabled } from './useWebGLCapability.js';

const KEY = 'meeting-queuer.webgl-mode';

export default function useWebGLSetting() {
  const [setting, setSetting] = useState(() => localStorage.getItem(KEY) ?? 'auto');

  const updateSetting = (value) => {
    localStorage.setItem(KEY, value);
    setSetting(value);
  };

  const webglEnabled = resolveWebGLEnabled(setting);

  // Return array for backward-compat with existing consumers that destructure [mode, setMode],
  // and also expose named properties for new consumers.
  const result = [setting, updateSetting];
  result.setting = setting;
  result.setSetting = updateSetting;
  result.webglEnabled = webglEnabled;
  return result;
}
