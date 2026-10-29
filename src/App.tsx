import { HashRouter, Route, Routes } from 'react-router-dom';
import HomeView from './views/HomeView';
import RoomView from './views/RoomView';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/room/:roomId" element={<RoomView />} />
        <Route path="*" element={<HomeView />} />
      </Routes>
    </HashRouter>
  );
}
