import GearIcon from './components/GearIcon';
import ManualForm from './components/ManualForm/ManualForm.jsx';
import Calendar from './components/Calendar/Calendar.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Meeting Room Queuer</span>
        <GearIcon />
      </header>
      <main className="app-main">
        <div className="calendar-area">
          <Calendar />
        </div>
        <div className="chat-dock">
          <ManualForm />
        </div>
      </main>
    </div>
  );
}
