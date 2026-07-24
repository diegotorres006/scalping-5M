import { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  History,
  LoaderCircle,
  LogOut,
  Send,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { analyzeTrade, getBotHealth } from '../services/tradingApi';

const initialForm = {
  close: '1.08500',
  zScore: '-2.0',
  distanceEma288: '0.5',
  volumeSpike: '2.0',
  lowerWickRatio: '0.1',
  upperWickRatio: '0.1',
  bodyRatio: '0.8',
  atr: '0.0015',
  isKillzone: true,
  notifyTelegram: true,
};

const fields = [
  ['close', 'Precio de cierre', 'Precio actual de EURUSD'],
  ['zScore', 'Z-Score', 'Desviación del precio respecto a su media'],
  ['distanceEma288', 'Distancia EMA288', 'Distancia normalizada a la EMA diaria'],
  ['volumeSpike', 'Pico de volumen', 'Volumen actual / volumen promedio'],
  ['lowerWickRatio', 'Mecha inferior', 'Proporción entre 0 y 1'],
  ['upperWickRatio', 'Mecha superior', 'Proporción entre 0 y 1'],
  ['bodyRatio', 'Cuerpo de vela', 'Proporción entre 0 y 1'],
  ['atr', 'ATR', 'Rango de volatilidad actual'],
];

function formatPrice(value) {
  return value == null ? '—' : Number(value).toFixed(5);
}

export default function Dashboard() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [botOnline, setBotOnline] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getBotHealth()
      .then((health) => setBotOnline(health.modelLoaded))
      .catch(() => setBotOnline(false));
  }, []);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const numeric = Object.fromEntries(
        fields.map(([name]) => [name, Number(form[name])]),
      );
      if (Object.values(numeric).some((value) => !Number.isFinite(value))) {
        throw new Error('Todos los indicadores deben ser números válidos.');
      }
      const analysis = await analyzeTrade({
        symbol: 'EURUSD',
        timeframe: 'M5',
        ...numeric,
        isKillzone: form.isKillzone,
        notifyTelegram: form.notifyTelegram,
      });
      setResult(analysis);
      setHistory((current) => [analysis, ...current].slice(0, 10));
      toast.success(
        analysis.approved
          ? `Señal ${analysis.label} autorizada`
          : 'La IA recomienda no operar',
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const ResultIcon = result?.decision === 'BUY'
    ? TrendingUp
    : result?.decision === 'SELL'
      ? TrendingDown
      : XCircle;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Activity className="text-blue-600" /> Panel de Trader
            </h1>
            <p className="mt-1 text-sm text-slate-500">EURUSD · velas de 5 minutos</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
              botOnline
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              Bot {botOnline ? 'conectado' : 'desconectado'}
            </span>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Bot size={20} className="text-blue-600" /> Datos para la IA
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ingresa los indicadores de la última vela cerrada.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([name, label, help]) => (
                <label key={name} className="block">
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <input
                    name={name}
                    type="number"
                    step="any"
                    value={form[name]}
                    onChange={updateField}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="mt-1 block text-xs text-slate-400">{help}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  name="isKillzone"
                  type="checkbox"
                  checked={form.isKillzone}
                  onChange={updateField}
                  className="size-4"
                />
                Está dentro de la Killzone
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  name="notifyTelegram"
                  type="checkbox"
                  checked={form.notifyTelegram}
                  onChange={updateField}
                  className="size-4"
                />
                Enviar resultado a Telegram
              </label>
            </div>
            <button
              type="submit"
              disabled={loading || !botOnline}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading
                ? <><LoaderCircle className="animate-spin" size={18} /> Analizando…</>
                : <><Send size={18} /> Analizar operación</>}
            </button>
          </form>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Resultado del modelo</h2>
            {!result ? (
              <div className="grid min-h-96 place-items-center text-center text-slate-400">
                <div>
                  <Bot className="mx-auto mb-3" size={44} />
                  <p>Envía los indicadores para recibir una decisión.</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className={`rounded-xl border-l-4 p-5 ${
                  result.approved
                    ? result.decision === 'BUY'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-red-500 bg-red-50 text-red-900'
                    : 'border-amber-500 bg-amber-50 text-amber-900'
                }`}>
                  <ResultIcon size={36} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider">Decisión</p>
                  <p className="text-3xl font-black">{result.label}</p>
                  <p className="mt-2 text-sm">
                    Probabilidad IA: <strong>{(result.probability * 100).toFixed(2)}%</strong>
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Entrada', result.entry],
                    ['Stop Loss', result.stopLoss],
                    ['TP parcial', result.takeProfitPartial],
                    ['TP runner', result.takeProfitRunner],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="mt-1 font-mono font-bold text-slate-800">
                        {formatPrice(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <h3 className="font-bold text-slate-800">Validaciones</h3>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {result.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        {result.approved
                          ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={16} />
                          : <XCircle className="mt-0.5 shrink-0 text-amber-500" size={16} />}
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className={`rounded-lg p-3 text-sm ${
                  result.telegram.sent
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {result.telegram.detail}
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <History size={20} /> Análisis de esta sesión
          </h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Todavía no hay análisis.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3">Hora</th>
                    <th className="p-3">Decisión</th>
                    <th className="p-3">Probabilidad</th>
                    <th className="p-3">Entrada</th>
                    <th className="p-3">Telegram</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.analysisId}>
                      <td className="p-3">{new Date(item.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 font-bold">{item.label}</td>
                      <td className="p-3">{(item.probability * 100).toFixed(2)}%</td>
                      <td className="p-3 font-mono">{formatPrice(item.entry)}</td>
                      <td className="p-3">{item.telegram.sent ? 'Enviado' : 'No enviado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
