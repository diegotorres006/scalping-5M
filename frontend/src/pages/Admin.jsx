import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ShieldAlert, Power, Users, MessageCircle, Activity, Plus, X } from 'lucide-react';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { db, app } from '../firebase/config'; 
import toast, { Toaster } from 'react-hot-toast';

// Datos estáticos
const equityData = [
  { name: 'Semana 1', balance: 10000 },
  { name: 'Semana 2', balance: 10250 },
  { name: 'Semana 3', balance: 10180 },
  { name: 'Semana 4', balance: 10500 },
];

const telegramLogs = [
  "[10:45 AM] - 🤖 Señal EURUSD enviada a usuarios.",
  "[10:42 AM] - ⚙️ Calculando ATR y Order Blocks para EURUSD.",
  "[09:15 AM] - ✅ TP Alcanzado en EURUSD (+40 pips).",
  "[08:00 AM] - 🚀 Bot iniciado y conectado a WebSockets.",
];

export default function Admin() {
  const [botActive, setBotActive] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: 'user' });

  const activeSignal = { pair: 'EURUSD', type: 'COMPRA', entry: 1.0850, sl: 1.0830, tp: 1.0890 };

  // Obtener usuarios desde Firebase Firestore
  const fetchUsers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsersList(usersData);
    } catch {
      toast.error('Error al cargar usuarios de la base de datos');
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchUsers, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers]);

  const handleToggleBot = () => {
    setBotActive(!botActive);
    toast.success(`Bot ${!botActive ? 'encendido' : 'apagado'} correctamente`);
  };

  // Función para registrar un nuevo usuario en Firebase Auth y Firestore
  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (newUser.password.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres');
    }

    try {
      // 1. Crear una conexión temporal a Firebase para no cerrar tu sesión de Admin
      const secondaryApp = initializeApp(app.options, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Crear la cuenta real en Firebase Authentication con la contraseña
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newUser.email.toLowerCase(), 
        newUser.password
      );
      const newUid = userCredential.user.uid;

      // 3. Guardar los datos en Firestore vinculados al UID real
      const userRef = doc(db, 'users', newUid);
      await setDoc(userRef, {
        name: newUser.name,
        email: newUser.email.toLowerCase(),
        phone: newUser.phone,
        role: newUser.role,
        createdAt: new Date().toISOString()
      });

      // 4. Cerrar la sesión de la app temporal para mantener la tuya activa
      await secondaryAuth.signOut();

      toast.success('Usuario registrado con acceso y contraseña');
      setShowModal(false);
      setNewUser({ name: '', email: '', phone: '', password: '', role: 'user' }); // Limpiar formulario
      fetchUsers(); // Actualizar tabla
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este correo ya está registrado en la plataforma');
      } else {
        toast.error('Hubo un error al registrar el usuario');
      }
    }
  };

  // Función para eliminar usuario de Firestore
  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast.success('Usuario eliminado');
        fetchUsers(); // Actualizar tabla
      } catch {
        toast.error('Error al eliminar usuario');
      }
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 relative">
      <Toaster />
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado Admin */}
        <header className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-xl shadow-md">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-yellow-400" /> Panel de Administrador
          </h1>
          <button 
            onClick={handleToggleBot}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              botActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            <Power size={20} />
            {botActive ? 'APAGAR BOT (Kill Switch)' : 'ENCENDER BOT'}
          </button>
        </header>

        {/* Banner de Señal de Entrada Actual */}
        {botActive && activeSignal && (
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Activity className="text-blue-500" size={32} />
              <div>
                <h2 className="text-lg font-bold">MONITOREO EN VIVO: {activeSignal.pair}</h2>
                <p className="font-medium text-sm text-gray-500">El modelo ejecutó una {activeSignal.type}</p>
              </div>
            </div>
            <div className="flex gap-6 font-mono text-sm bg-gray-100 p-2 rounded-lg">
              <div><span className="font-bold">Entry:</span> {activeSignal.entry}</div>
              <div className="text-red-600"><span className="font-bold">SL:</span> {activeSignal.sl}</div>
              <div className="text-green-600"><span className="font-bold">TP:</span> {activeSignal.tp}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Gráfica Global de Ganancias */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Curva de Equidad Global</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica Exclusiva EURUSD */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Actividad de Par Analizado</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[ { name: 'EURUSD', ops: 15 } ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ops" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logs de Telegram */}
          <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-1">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageCircle size={20} className="text-blue-500" /> Logs de Telegram
            </h3>
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto space-y-2">
              {telegramLogs.map((log, index) => (
                <div key={index} className="border-b border-gray-800 pb-1">{log}</div>
              ))}
            </div>
          </div>

          {/* Gestión de Usuarios desde Firebase */}
          <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" /> Usuarios de Firebase
              </h3>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 transition flex items-center gap-1"
              >
                <Plus size={16}/> Registrar Usuario
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm border-y border-gray-200">
                    <th className="p-3 font-semibold">Nombre & Email</th>
                    <th className="p-3 font-semibold">Celular</th>
                    <th className="p-3 font-semibold">Rol</th>
                    <th className="p-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersList.length === 0 ? (
                    <tr><td colSpan="4" className="p-4 text-center text-gray-500">Cargando usuarios...</td></tr>
                  ) : (
                    usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-800">
                          {user.name} <br/><span className="text-xs text-gray-500">{user.email}</span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">{user.phone}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="p-3">
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm transition"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PARA REGISTRO DE NUEVO USUARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-96 relative animate-fade-in">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Añadir Nuevo Usuario</h2>
            <form onSubmit={handleRegisterUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input 
                  type="text" className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                  value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                <input 
                  type="email" className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                  value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Celular (Telegram)</label>
                <input 
                  type="tel" placeholder="+593 999 999 999" className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                  value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña de Acceso</label>
                <input 
                  type="password" placeholder="Mínimo 6 caracteres" className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                  value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rol de Usuario</label>
                <select 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="user">Normal (Trader)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition font-bold mt-2">
                Guardar Usuario
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
