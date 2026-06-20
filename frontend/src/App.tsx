import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Attendance from './pages/Attendance';
import AttendanceDashboard from './pages/AttendanceDashboard';
import SongList from './pages/SongList';
import AddSong from './pages/AddSong';
import SongDetail from './pages/SongDetail';
import EditSong from './pages/EditSong';
import PrintAttendance from './pages/PrintAttendance';
import PrintSong from './pages/PrintSong';
import { pingServer } from './api/attendance';

export default function App() {
  useEffect(() => {
    pingServer();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/dashboard" element={<AttendanceDashboard />} />
            <Route path="/songs" element={<SongList />} />
            <Route path="/songs/add" element={<AddSong />} />
            <Route path="/songs/:id" element={<SongDetail />} />
            <Route path="/songs/:id/edit" element={<EditSong />} />
            <Route path="/print/attendance" element={<PrintAttendance />} />
            <Route path="/print/song/:id" element={<PrintSong />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { style: { background: '#EAF0F7', color: '#1A1A1A', border: '1px solid #5B7FA6' } },
            error: { style: { background: '#FEF2F2', color: '#991B1B' } },
          }}
        />
      </div>
    </BrowserRouter>
  );
}
