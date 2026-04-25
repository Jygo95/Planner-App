import GearIcon from './components/GearIcon';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Meeting Room Queuer</span>
        <GearIcon />
      </header>
      <main className="app-main">
        <div className="calendar-area" />
        <div className="chat-dock" />
      </main>
    </div>
  );
}
