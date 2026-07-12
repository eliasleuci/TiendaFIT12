import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IS_DEMO = !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('tu-proyecto') ||
  import.meta.env.VITE_SUPABASE_URL.includes('mock.supabase');

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();

  // En modo demo (sin Supabase configurado) se permite acceso directo al admin
  if (IS_DEMO) return children;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Cargando...</div>;
  }
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
