# Sistema de Trading con Inteligencia Artificial (EURUSD)

## ¿Qué es este proyecto?

Este proyecto es un sistema de investigación de Trading Algorítmico. En palabras simples, en lugar de que un humano mire gráficos todo el día intentando adivinar si el precio del Euro frente al Dólar (EURUSD) va a subir o bajar, hemos construido un programa informático que analiza millones de datos históricos, aprende matemáticamente de ellos usando Inteligencia Artificial, y decide de forma autónoma cuándo es estadísticamente rentable comprar o vender.

Todo el ecosistema de investigación y simulación está condensado en 3 Cuadernos Jupyter, los cuales representan las tres fases lógicas de un proyecto de Ciencia de Datos: Extracción, Aprendizaje y Simulación.

---

## El Horario Operativo: La "Killzone"

El mercado de divisas está abierto las 24 horas, pero no todas las horas son iguales. Este bot tiene estrictamente prohibido operar fuera de una ventana de tiempo específica (de 07:00 a 16:00, hora del servidor). A este periodo lo llamamos Killzone.

¿Por qué esta restricción? En ese bloque horario ocurre el solapamiento de las dos bolsas más grandes del mundo: Londres y Nueva York. Es el momento donde los grandes bancos e instituciones inyectan el volumen de dinero real al mercado. Operar fuera de este horario significa operar en un mercado "muerto", sin liquidez, donde los movimientos son erráticos, aleatorios y el algoritmo pierde su ventaja matemática.

---

## Cuaderno 1: Carga de Datos y Creación de Variables (Feature Engineering)

La Inteligencia Artificial no entiende gráficos de velas ni líneas de colores; solo entiende números. El primer cuaderno se conecta al proveedor de datos y descarga el historial de precios en bloques de 5 minutos. Luego, transforma esos precios en métricas matemáticas que describen el "estado de ánimo" del mercado.

Las variables más importantes que calculamos son:

* **Z-Score (El estiramiento del precio):** Imagina que el precio es una liga elástica amarrada a un punto central (su precio promedio). El Z-Score mide matemáticamente qué tan estirada está esa liga.
* **Cálculo:** $\frac{\text{Precio Actual} - \text{Precio Promedio}}{\text{Desviación Estándar}}$
* **Lógica:** Si el Z-Score es muy alto o muy bajo (mayor a 1.8 o menor a -1.8), la liga está demasiado tensa y es muy probable que el precio "regrese" violentamente a su centro.


* **EMA 288 (La Brújula Diaria):** Es un promedio de los últimos 288 periodos. ¿Por qué 288? Porque un día completo tiene 24 horas, lo que equivale exactamente a 288 velas de 5 minutos. Nos dice hacia dónde se dirigió la tendencia de todo el día anterior.
* **Volumen Spike (La Huella Institucional):** Mide la cantidad de transacciones.
* **Cálculo:** $\frac{\text{Volumen Actual}}{\text{Promedio del Volumen Reciente}}$
* **Lógica:** Si de repente el volumen es un 10% o 20% mayor al promedio (ratio mayor a 1.1), significa que una "ballena" (institución) acaba de entrar al mercado, y el bot debe prestar atención.


* **Ratios de la Vela (Cuerpo vs Mechas):** Una "vela" nos dice dónde abrió y dónde cerró el precio. Si el precio subió mucho pero luego cayó antes de cerrar, deja un rastro visual llamado "mecha". Calculamos el porcentaje de mecha en relación a toda la vela. Un ratio de mecha alto en la parte inferior indica que el mercado intentó bajar, pero los compradores rechazaron fuertemente ese precio.

Finalmente, este cuaderno etiqueta el pasado: mira hacia el futuro (12 periodos adelante) y anota con un "1" si una compra hubiera sido exitosa, y con un "0" si hubiera generado pérdidas.

---

## Cuaderno 2: El Cerebro del Sistema (Entrenamiento del Modelo XGBoost)

El segundo cuaderno es donde ocurre la "magia" del aprendizaje automático. Aquí tomamos todos los datos matemáticos calculados en el Cuaderno 1 y se los pasamos a un algoritmo llamado XGBoost.

### ¿Qué es y cómo funciona XGBoost?

XGBoost se basa en "Árboles de Decisión". Imagina el juego "Adivina Quién". Para adivinar el personaje, haces preguntas de descarte ("¿Tiene sombrero?", "¿Tiene gafas?"). Un árbol de decisión hace lo mismo con el precio: "¿El Z-Score es mayor a 1.8? -> Sí. ¿Hay un pico de volumen institucional? -> Sí. ¿Estamos en la Killzone? -> Sí. Entonces: COMPRA".

El XGBoost no crea un solo árbol, crea un "bosque" de cientos de árboles. La magia radica en la palabra Boosting (impulso): el algoritmo crea un primer árbol, revisa en qué operaciones se equivocó, y crea un segundo árbol diseñado específicamente para corregir los errores del primero. Repite este proceso cientos de veces, volviéndose extremadamente preciso. Al final, ante una situación del mercado, el modelo emite una probabilidad. Por ejemplo: "Con base en mis miles de árboles, esta situación tiene un 72% de probabilidad de ser una compra exitosa".

**Protección contra el sesgo (In-Sample):** En este cuaderno, el modelo se entrena estrictamente con datos de los años 2023 y 2024. Se le oculta por completo el año 2025 para no "hacer trampa" antes del examen final.

---

## Cuaderno 3: Simulación y Evaluación (Backtest)

El tercer cuaderno es la prueba de fuego. Aquí simulamos haber operado durante todo el año 2025 (lo que llamamos periodo Out-of-Sample o fuera de muestra). Como el modelo jamás vio estos datos, su rendimiento aquí nos dice cómo se comportaría en la vida real.

### La Gestión de Riesgo (La regla de oro del bot):

Incluso si la IA dice que hay una buena oportunidad, el bot aplica gestión de riesgo financiera antes de disparar:

* **Stop Loss (El freno de emergencia):** Si el precio se va en contra, el bot asume la pérdida rápidamente y cierra la operación antes de perder demasiado dinero. Nunca arriesga más del 0.7% del dinero total de la cuenta en una sola operación.
* **Toma de Ganancias Parcial (El seguro):** Si la operación va a favor y gana un poco, el bot asegura la mitad de las ganancias en el bolsillo y mueve el freno de emergencia al punto de inicio. Si el mercado se da la vuelta, el bot ya no puede perder dinero en esa jugada.
* **Runner (Dejar correr las ganancias):** La otra mitad de la operación se deja abierta buscando atrapar un movimiento grande en el precio que multiplique la ganancia inicial por 3 o por 5.

### Resultados del Backtest:

El cuaderno recorre cada vela del año 2025, simula las compras, ventas, cobro de comisiones del broker y pérdidas por diferencias de precios (spread). Al finalizar, exporta un archivo Excel (.csv) con el historial completo de cada jugada y dibuja la gráfica del crecimiento del capital.

El resultado se mide evaluando el Profit Factor (por cada dólar perdido, cuántos se ganaron), el Win Rate (porcentaje de acierto) y el Drawdown (la peor racha de pérdidas o caída máxima de la cuenta desde su punto más alto), garantizando que el sistema sea estable y matemáticamente viable antes de poner un solo dólar real en el mercado.