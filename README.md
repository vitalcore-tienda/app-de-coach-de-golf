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
├── manifest.json                # Metadatos de la aplicación instalable (PWA)
├── service-worker.js            # Caché offline de la interfaz y sus recursos locales
├── Abrir Coach de Golf.bat       # Acceso directo para ejecutar la app en Windows con un clic
├── README.md                    # Documentación del proyecto
├── assets/
│   └── icons/                   # Íconos PNG para Android, iPhone y accesos directos
├── css/
│   ├── style.css                # Sistema de diseño, tokens, paleta Augusta/Gold y dark mode
│   └── components.css           # Componentes UI (Cards, Radar, Temporizador, Scorecard, Chat)
├── vendor/
│   └── supabase/                # Cliente oficial de Supabase fijado por versión y hash
├── database/
│   ├── schema.sql               # Esquema PostgreSQL portable de referencia
│   └── supabase/migrations/     # Esquema cloud con roles, RLS y autenticación preparada
└── js/
    ├── database.js              # Base local IndexedDB y tablas de datos estructurados
    ├── storage.js               # Repositorio y caché de datos por golfista
    ├── players.js               # Fichas de golfistas, hándicap y torneos
    ├── assessment.js            # Cuestionario diagnóstico 360° y cálculo del radar de habilidades
    ├── drills.js                # Catálogo de drills y temporizador Pomodoro de golf con audio
    ├── mental.js                # Animador de respiración táctica y rutina pre-golpe
    ├── tactics.js               # Caddy virtual, selector inteligente de palos y playbook de campo
    ├── rounds.js                # Scorecard interactivo de 9/18 hoyos y estadísticas avanzadas
    ├── mentor.js                # Chat interactivo con el Coach, metas SMART y diario del jugador
    ├── pwa.js                   # Instalación, atajos y aviso de conectividad
    ├── auth.js                  # Magic Link, sesión y activación del primer entrenador
    ├── player-portal.js         # Vista privada del golfista y mensajería con su entrenador
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
8. **Gestionar golfistas**: En **Golfistas & Datos**, crea una ficha por jugador, registra la evolución del hándicap y carga sus torneos. Cada ronda queda vinculada al golfista activo.

En el panel del entrenador, la barra de contexto diferencia siempre la **cuenta conectada** del **golfista seleccionado**. Antes de registrar una ronda, la app también indica de forma explícita en qué ficha se guardará.

Si hay una sesión por correo pero Supabase todavía no puede confirmar su rol, GolfCoach mantiene ocultas las fichas locales y ofrece reintentar la verificación. La aplicación nunca interpreta una cuenta pendiente como entrenador por descarte.

## 📲 Instalarla en el celular

La versión publicada en GitHub Pages es una aplicación web instalable. Abrila desde:

<https://vitalcore-tienda.github.io/app-de-coach-de-golf/>

- En Android (Chrome o Edge), tocá **Instalar** dentro de la app o usá el menú de tres puntos → **Instalar aplicación** / **Agregar a pantalla principal**.
- En iPhone/iPad, abrila en Safari → **Compartir** → **Agregar a pantalla de inicio**.

El ícono queda en el teléfono y la interfaz, las fichas ya abiertas y los recursos de la app quedan disponibles sin conexión. El archivo `.bat` sirve para abrir una copia local en Windows, pero `file://` no permite instalarla ni activar el service worker; para esas funciones usá la URL HTTPS.

---

## 🗃️ Datos de golfistas

La aplicación usa **IndexedDB** como base de datos local del navegador. Guarda:

- Fichas de múltiples golfistas: datos de contacto, licencia, hándicap, club, lateralidad, experiencia y distancia de driver.
- Historial de hándicap con fecha, origen y notas.
- Torneos por jugador y rondas opcionalmente vinculadas a un torneo.
- Rondas y sus 9/18 hoyos: golpes, par, putts, FIR, GIR, bunker y penalidades.

La primera vez que se abre la versión nueva, los datos anteriores de LocalStorage se migran automáticamente. Como respaldo, el entrenador puede activar la sincronización cloud desde el ícono ☁️: la app sigue guardando primero en IndexedDB y conserva una cola para reintentar cuando vuelva la conexión.

## 🔐 Cuentas compartidas y base cloud

Para compartir una ficha entre entrenador y golfista, el diseño preparado usa Supabase Auth y PostgreSQL:

- El entrenador crea la ficha y queda asignado automáticamente al jugador.
- El golfista entra con un enlace de un solo uso enviado a su correo; al confirmar el mismo mail que figura en su ficha, queda vinculado a ella sin duplicar datos.
- Las reglas RLS impiden que un golfista consulte a otros jugadores, y que un entrenador acceda a jugadores que no tiene asignados.
- El rol de primer entrenador se protege con un código de configuración de una sola vez; ninguna clave administrativa se publica en la app, el repositorio o GitHub Pages.
- El acceso se abre desde el ícono ✉️ de la barra superior. No utiliza contraseña: Supabase envía un Magic Link y la app conserva la sesión del dispositivo mediante su cliente oficial versionado localmente.

### Experiencia según el rol

- **Entrenador:** conserva el panel completo para crear y administrar golfistas, cargar handicap, torneos y rondas. En cada ficha respaldada en la nube también puede asignar entrenamientos y abrir una conversación privada.
- **Golfista:** al iniciar sesión ve únicamente **Mi golf**, una pantalla simplificada con handicap y evolución, entrenamientos asignados, próximos torneos, metas, resultados/rondas y mensajes de su entrenador. No aparecen controles para crear, cambiar ni administrar a otros golfistas.
- El golfista puede marcar sus entrenamientos como iniciados o completados y responder mensajes. Las políticas RLS de Supabase limitan todas las lecturas y cambios a la ficha vinculada con su propio correo.
- La última versión consultada del portal se guarda en el dispositivo para poder verla sin conexión. Enviar mensajes, cambiar el estado de un entrenamiento o traer datos nuevos requiere conexión.

Las migraciones de la plataforma dedicada GolfCoach están en [`database/supabase/migrations`](database/supabase/migrations): estructura, endurecimiento del primer entrenador, seguridad adicional e índices. El proyecto de Supabase debe ser exclusivo de GolfCoach; no se deben aplicar estas migraciones a otras apps de VitalCore. En Supabase Auth, Site URL y Redirect URL deben ser exactamente `https://vitalcore-tienda.github.io/app-de-coach-de-golf/`.

Después de publicar esta versión, el primer entrenador inicia sesión con su mail, elige **Tengo el código del primer entrenador** e ingresa el código único entregado por la persona administradora. Al activarse, toca ☁️ y elige **Activar respaldo y sincronizar** para realizar la primera carga explícita de las fichas que ya están en ese dispositivo. Desde entonces, los cambios del entrenador se encolan localmente y se respaldan al recuperar conexión. El código se consume al activarse; guardalo de forma privada y nunca lo subas al repositorio.

No subas nombres, teléfonos, correos, códigos de activación ni claves administrativas al repositorio: GitHub Pages es público. La app usa solamente una publishable key en el navegador; las políticas RLS de PostgreSQL autorizan cada dato en el servidor.
