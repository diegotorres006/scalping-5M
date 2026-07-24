import { useState } from 'react';
import { auth, db, googleProvider } from '../firebase/config';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Función unificada para verificar el usuario en la base de datos
  const checkUserDocument = async (user) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      toast.success(`Bienvenido, ${userData.role === 'admin' ? 'Administrador' : 'Trader'}`);
      navigate(userData.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      // Es la primera vez, pedimos el celular
      setCurrentUser(user);
      setNeedsPhone(true);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await checkUserDocument(result.user);
    } catch /*(error)*/ {
      toast.error('Error al iniciar sesión con Google');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await checkUserDocument(result.user);
    } catch /*(error)*/ {
      toast.error('Credenciales incorrectas');
    }
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    if (phone.length < 9) return toast.error('Ingresa un número válido');

    try {
      // Guardar el nuevo usuario en Firestore con rol 'user' por defecto
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        name: currentUser.displayName || 'Usuario Trader',
        phone: phone,
        role: 'user', // Tú luego puedes cambiar manualmente en Firebase a 'admin' el tuyo
        createdAt: new Date().toISOString()
      });
      toast.success('Registro completado');
      navigate('/dashboard');
    } catch /*(error)*/ {
      toast.error('Error al guardar los datos');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Toaster />
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          AI Trading Bot
        </h2>

        {!needsPhone ? (
          <>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={email} onChange={(e) => setEmail(e.target.value)} required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <input 
                  type="password" 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={password} onChange={(e) => setPassword(e.target.value)} required 
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition">
                Iniciar Sesión
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <span className="border-b w-1/5 lg:w-1/4"></span>
              <span className="text-xs text-center text-gray-500 uppercase">O también</span>
              <span className="border-b w-1/5 lg:w-1/4"></span>
            </div>

            <button 
              onClick={handleGoogleLogin} 
              className="mt-4 w-full border border-gray-300 text-gray-700 p-2 rounded-md hover:bg-gray-50 transition flex justify-center items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar con Google
            </button>
          </>
        ) : (
          <form onSubmit={handleSavePhone} className="space-y-4 animate-fade-in">
            <div className="text-center bg-blue-50 text-blue-800 p-3 rounded-md text-sm mb-4">
              Es tu primera vez aquí. Necesitamos tu número para enviarte las señales por Telegram.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Número de Celular</label>
              <input 
                type="tel" 
                placeholder="+593 999 999 999"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                value={phone} onChange={(e) => setPhone(e.target.value)} required 
              />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition">
              Completar Registro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
