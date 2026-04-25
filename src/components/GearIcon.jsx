import { useState, useRef, useEffect } from 'react';
import SettingsSheet from './SettingsSheet';
import './GearIcon.css';

export default function GearIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen]);

  return (
    <div className="gear-icon-container" ref={containerRef}>
      <button
        aria-label="Settings"
        className="gear-button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        ⚙
      </button>
      {isOpen && <SettingsSheet onClose={() => setIsOpen(false)} />}
    </div>
  );
}
