import useWebGLSetting from '../hooks/useWebGLSetting';
import './SettingsSheet.css';

const OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Force enable WebGL', value: 'force-webgl' },
  { label: 'Force CSS only', value: 'force-css' },
];

export default function SettingsSheet({ onClose }) {
  const [mode, setMode] = useWebGLSetting();

  const handleSelect = (value) => {
    setMode(value);
    if (onClose) onClose();
  };

  return (
    <div className="settings-sheet" role="dialog" aria-label="Settings">
      {OPTIONS.map(({ label, value }) => {
        const isSelected = mode === value;
        return (
          <button
            key={value}
            className={isSelected ? 'settings-option selected' : 'settings-option'}
            aria-pressed={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => handleSelect(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
