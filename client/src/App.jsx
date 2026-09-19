import { BrowserRouter, Route, Routes } from 'react-router';
import Login from '../pages/Login.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          {/* Placeholder until the Home screen is built */}
          <Route path="/" element={<div className="p-4">Home</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
