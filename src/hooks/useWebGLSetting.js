import { useState, useEffect } from 'react';
import { resolveWebGLEnabled } from './useWebGLCapability.js';

const KEY = 'meeting-queuer.webgl-mode';
const CHANGE_EVENT = 'webgl-setting-change';

export default function useWebGLSetting() {
  const [setting, _setSetting] = useState(() => localStorage.getItem(KEY) ?? 'auto');

  // Sync across multiple hook instances (e.g. SettingsSheet and ChatDock)
  useEffect(() => {
    const handler = () => _setSetting(localStorage.getItem(KEY) ?? 'auto');
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateSetting = (value) => {
    localStorage.setItem(KEY, value);
    _setSetting(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
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
