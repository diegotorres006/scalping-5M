import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import { auth, db } from './firebase/config';

function ProtectedRoute({ children, requiredRole }) {
  const [state, setState] = useState({ loading: true, user: null, role: null });

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setState({ loading: false, user: null, role: null });
      return;
    }
    let role;
    try {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      role = snapshot.exists() ? snapshot.data().role || 'user' : 'user';
    } catch {
      role = 'user';
    }
    setState({ loading: false, user, role });
  }), []);

  if (state.loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-100 text-gray-600">
        Verificando sesión…
      </div>
    );
  }
  if (!state.user) return <Navigate to="/" replace />;
  if (requiredRole && state.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
