# 🏌️‍♂️ GolfCoach Pro • Plataforma Integral de Mentoría de Golf

Plataforma web interactiva de mentoría, entrenamiento estructurado y gestión de rendimiento para golfistas inspirada en la metodología de **SotaPar** (*"El coach de golf: Un mentor para mejorar como golfista a tu máximo nivel"*).

---

## 🌟 Pilares Fundamentales del Enfoque 360°

1. **Técnica & Mecánica de Swing**: Diagnóstico de vuelo de bola, solución de fallos típicos (*slice, hook, tops*) y drills con varillas y toalla.
2. **Juego Corto**: Dominio del putting (ladder drill, gate drill), control de distancias de wedges con el método del reloj y sacadas de arena con bounce.
3. **Estrategia & Course Management**: Pensar como golfista de torneo, eliminación del lado de peligro, cálculo de distancias efectivas (*Plays-Like*) y juego al centro de green.
4. **Juego Mental & Psicología**: Rutina pre-golpe invariable, respiración táctica cuadrada (*Box Breathing 4-4-4-4*), regla de los 10 pasos y reset emocional.
5. **Fitness & Flexibilidad**: Disociación de hombros y caderas, movilidad 90/90 y prevención de fatiga en los últimos hoyos.
6. **Análisis Estadístico & Scorecard**: Registro hoyo por hoyo, cálculo de FIR%, GIR%, promedio de putts por ronda y evolución de hándicap.

---

## 📁 Estructura del Proyecto

```text
coach-de-golf/
├── index.html                   # Interfaz SPA con navegación por pestañas y diseño responsive
├── Abrir Coach de Golf.bat       # Acceso directo para ejecutar la app en Windows con un clic
├── README.md                    # Documentación del proyecto
├── css/
│   ├── style.css                # Sistema de diseño, tokens, paleta Augusta/Gold y dark mode
│   └── components.css           # Componentes UI (Cards, Radar, Temporizador, Scorecard, Chat)
└── js/
    ├── storage.js               # Persistencia de datos local en LocalStorage
    ├── assessment.js            # Cuestionario diagnóstico 360° y cálculo del radar de habilidades
    ├── drills.js                # Catálogo de drills y temporizador Pomodoro de golf con audio
    ├── mental.js                # Animador de respiración táctica y rutina pre-golpe
    ├── tactics.js               # Caddy virtual, selector inteligente de palos y playbook de campo
    ├── rounds.js                # Scorecard interactivo de 9/18 hoyos y estadísticas avanzadas
    ├── mentor.js                # Chat interactivo con el Coach, metas SMART y diario del jugador
    └── app.js                   # Controlador principal, cambio de temas y gestión de modales
```

---

## 🚀 Cómo Usar la Aplicación

1. **Abrir la app**: Haz doble clic en `Abrir Coach de Golf.bat` o abre `index.html` en tu navegador favorito.
2. **Realizar el Diagnóstico 360°**: Ve a la pestaña **Diagnóstico 360°** y completa el test de 15 preguntas para ver tu balance en el radar y recibir el plan sugerido por el Coach.
3. **Entrenar con el Temporizador Pomodoro**: Dirígete a **Entrenamiento & Drills** y activa sesiones estructuradas de 20 minutos con descansos programados.
4. **Controlar la Ansiedad**: Usa el módulo **Juego Mental** para practicar la respiración cuadrada guiada antes de salir al campo.
5. **Calcular tu Palo con el Caddy**: En **Caddy & Estrategia**, ingresa la distancia láser y el viento para obtener la distancia efectiva y palo recomendado.
6. **Registrar tus Rondas**: Tras jugar, ingresa a **Scorecard & Rondas** para cargar tus golpes, putts y calles acertadas.
7. **Consultar al Mentor**: En **Mentoría & Metas**, haz preguntas al Coach Virtual para resolver dudas sobre tu swing y fijar tus metas de temporada.
