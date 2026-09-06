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
    ├── storage.js               # Repositorio aislado por entrenador y por golfista
    ├── utils.js                 # Fechas locales y utilidades compartidas
    ├── players.js               # Fichas de golfistas, hándicap y torneos
    ├── assessment.js            # Cuestionario diagnóstico 360° y cálculo del radar de habilidades
    ├── drills.js                # Catálogo de drills y temporizador Pomodoro de golf con audio
    ├── mental.js                # Animador de respiración táctica y rutina pre-golpe
    ├── tactics.js               # Caddy virtual, selector inteligente de palos y playbook de campo
    ├── rounds.js                # Scorecard interactivo de 9/18 hoyos y estadísticas avanzadas
    ├── mentor.js                # Chat interactivo con el Coach, metas SMART y diario del jugador
    ├── pwa.js                   # Instalación, atajos y aviso de conectividad
    ├── auth.js                  # Magic Link, sesión y activación del primer entrenador
    ├── icons.js                 # Familia SVG consistente para controles y navegación
    ├── player-portal.js         # Vista privada del golfista y mensajería con su entrenador
    └── app.js                   # Controlador principal, cambio de temas y gestión de modales
```

---

## 🚀 Cómo Usar la Aplicación

1. **Abrir la app e ingresar**: accedé con el correo del entrenador. Sin una cuenta verificada, las fichas locales permanecen bloqueadas.
2. **Elegir cómo empezar**: una instalación nueva comienza vacía. El entrenador puede agregar su primer golfista real o abrir una demostración separada, identificada permanentemente como **Modo demo** y excluida de la sincronización.
3. **Realizar el Diagnóstico 360°**: Ve a la pestaña **Diagnóstico 360°** y completa el test de 15 preguntas para ver tu balance en el radar y recibir el plan sugerido por el Coach.
4. **Entrenar con el Temporizador Pomodoro**: Dirígete a **Entrenamiento & Drills** y activa sesiones estructuradas de 20 minutos con descansos programados.
5. **Controlar la Ansiedad**: Usa el módulo **Juego Mental** para practicar la respiración cuadrada guiada antes de salir al campo.
6. **Calcular tu Palo con el Caddy**: En **Caddy & Estrategia**, ingresa la distancia láser y el viento para obtener la distancia efectiva y palo recomendado.
7. **Registrar tus Rondas**: Tras jugar, ingresa a **Scorecard & Rondas** para cargar tus golpes, putts y calles acertadas.
8. **Consultar al Mentor**: En **Mentoría & Metas**, haz preguntas al Coach Virtual para resolver dudas sobre tu swing y fijar tus metas de temporada.
9. **Gestionar golfistas**: En **Golfistas**, crea una ficha por jugador, registra la evolución del hándicap y carga sus torneos. Cada ronda queda vinculada al golfista activo.

En el panel del entrenador, la barra de contexto diferencia siempre la **cuenta conectada** del **golfista seleccionado**. Antes de registrar una ronda, la app también indica de forma explícita en qué ficha se guardará.

En celular, la navegación cambia según el rol. El entrenador dispone de **Inicio · Golfistas · Planes · Mensajes · Más**, con Golfistas y las conversaciones siempre al alcance del pulgar. La cuenta de golfista ve solamente **Hoy · Mi plan · Progreso · Mensajes** y cada acceso la lleva a la sección correspondiente de su portal privado.

Los controles, estados y módulos usan una única familia de iconos SVG. El dorado queda reservado para la sección seleccionada y las acciones principales; los emojis que una persona escriba dentro de mensajes o notas se conservan como contenido personal.

Las ventanas para agregar golfistas, rondas, torneos, metas y entrenamientos comparten la misma estructura: título y contexto claros, campos agrupados, ayuda breve, validación junto al dato incorrecto y acciones consistentes para cancelar o guardar.

En celular, el scorecard muestra los 18 hoyos en una cuadrícula táctil, mantiene golpes y putts lado a lado, ofrece scores rápidos respecto del par y avanza con **Guardar y seguir**. La barra de progreso resume golpes y putts, y una carga iniciada requiere confirmación antes de descartarse.

La interfaz usa una escala compartida de tipografía y espaciado para mantener la misma jerarquía en títulos, tarjetas, etiquetas, formularios y vistas de entrenador o golfista. Los márgenes y rellenos se adaptan de forma compacta en celular sin reducir la legibilidad.

Mientras se abren fichas, el portal o las conversaciones, la interfaz muestra esqueletos que reservan el espacio sin inventar datos. Cada guardado confirma qué se actualizó; si falla internet o Supabase, GolfCoach diferencia el modo offline de un respaldo pendiente, conserva visible la cola cloud y permite reintentar sin confundirla con una operación completada.

La interfaz incluye acceso directo para saltar al contenido, foco visible, navegación operable con teclado y áreas táctiles de al menos 44 × 44 px en los controles principales. Las ventanas y el menú celular contienen y restauran el foco, los cambios de sección y progreso se anuncian a lectores de pantalla, y las animaciones se reducen cuando el dispositivo tiene activada esa preferencia. Los colores de texto del tema oscuro y claro cumplen contraste AA sobre las superficies habituales.

Si hay una sesión por correo pero Supabase todavía no puede confirmar su rol, GolfCoach mantiene ocultas las fichas locales y ofrece reintentar la verificación. La aplicación nunca interpreta una cuenta pendiente como entrenador por descarte.

## 📲 Instalarla en el celular

La versión publicada en GitHub Pages es una aplicación web instalable. Abrila desde:

<https://adanbrilzgolf.com.ar/>

- En Android (Chrome o Edge), tocá **Instalar** dentro de la app o usá el menú de tres puntos → **Instalar aplicación** / **Agregar a pantalla principal**.
- En iPhone/iPad, abrila en Safari → **Compartir** → **Agregar a pantalla de inicio**.

El ícono queda en el teléfono y los recursos de la app quedan disponibles sin conexión. Las fichas pueden abrirse offline mientras el dispositivo conserve una sesión de entrenador válida y su rol haya sido verificado durante los últimos 30 días. El archivo `.bat` sirve para abrir una copia local en Windows, pero `file://` no permite instalarla ni activar el service worker; para esas funciones usá la URL HTTPS.

### Dominio oficial

El dominio canónico de producción es `adanbrilzgolf.com.ar`. El repositorio incluye el archivo `CNAME` requerido por GitHub Pages. Como NIC Argentina administra el registro pero no la zona DNS, el dominio debe delegarse a un proveedor DNS antes de activar HTTPS. La opción recomendada es Cloudflare Free:

1. Agregar `adanbrilzgolf.com.ar` a Cloudflare y copiar los dos servidores de nombres asignados.
2. En NIC Argentina/TAD, abrir el dominio, elegir **Delegar**, agregar esos dos servidores y guardar.
3. En la zona DNS de Cloudflare, crear estos registros inicialmente como **Sólo DNS**:
   - `A` · nombre `@` · `185.199.108.153`
   - `A` · nombre `@` · `185.199.109.153`
   - `A` · nombre `@` · `185.199.110.153`
   - `A` · nombre `@` · `185.199.111.153`
   - `CNAME` · nombre `www` · `vitalcore-tienda.github.io`
4. En GitHub, abrir **Settings → Pages**, guardar `adanbrilzgolf.com.ar` como **Custom domain** y, cuando el certificado esté disponible, activar **Enforce HTTPS**.
5. En Supabase, abrir **Authentication → URL Configuration**, usar `https://adanbrilzgolf.com.ar/` como **Site URL** y agregarla también como Redirect URL. Conservar temporalmente `https://vitalcore-tienda.github.io/app-de-coach-de-golf/` como redirección adicional hasta finalizar la transición.

No uses un registro DNS comodín (`*`) ni agregues el nombre del repositorio al destino CNAME de `www`. La propagación de la delegación, los DNS y el certificado puede demorar varias horas.

---

## 🗃️ Datos de golfistas

La aplicación usa **IndexedDB** como base de datos local del navegador. Guarda:

- Fichas de múltiples golfistas: datos de contacto, licencia, hándicap, club, lateralidad, experiencia y distancia de driver.
- Historial de hándicap con fecha, origen y notas.
- Torneos por jugador y rondas opcionalmente vinculadas a un torneo.
- Rondas y sus 9/18 hoyos: golpes, par, putts, FIR, GIR, bunker y penalidades.

Cada registro local pertenece al identificador de la cuenta de entrenador. Al cerrar sesión, el workspace se bloquea y la ficha activa se elimina de memoria. Los datos antiguos sin propietario no se borran ni se entregan automáticamente a otra cuenta: aparecen como fichas anteriores y deben vincularse de forma explícita. Las demostraciones nuevas o anteriores se muestran con el distintivo **Modo demo**, usan nombres inequívocos y nunca se sincronizan.

Como respaldo, el entrenador puede activar la sincronización cloud desde la acción **Sincronización cloud**: la app sigue guardando primero en IndexedDB y conserva una cola para reintentar cuando vuelva la conexión.

## 🔐 Cuentas compartidas y base cloud

Para compartir una ficha entre entrenador y golfista, el diseño preparado usa Supabase Auth y PostgreSQL:

- El entrenador crea la ficha y queda asignado automáticamente al jugador.
- El golfista entra con un enlace de un solo uso enviado a su correo; al confirmar el mismo mail que figura en su ficha, queda vinculado a ella sin duplicar datos.
- Las reglas RLS impiden que un golfista consulte a otros jugadores, y que un entrenador acceda a jugadores que no tiene asignados.
- El rol de primer entrenador se protege con un código de configuración de una sola vez; ninguna clave administrativa se publica en la app, el repositorio o GitHub Pages.
- El acceso se abre desde la acción de cuenta de la barra superior. No utiliza contraseña: Supabase envía un Magic Link y la app conserva la sesión del dispositivo mediante su cliente oficial versionado localmente.

### Experiencia según el rol

- **Entrenador:** conserva el panel completo para crear y administrar golfistas, cargar handicap, torneos y rondas. En cada ficha respaldada en la nube también puede asignar entrenamientos y abrir una conversación privada.
- **Golfista:** al iniciar sesión ve únicamente **Mi golf**, una pantalla simplificada con handicap y evolución, entrenamientos asignados, próximos torneos, metas, resultados/rondas y mensajes de su entrenador. No aparecen controles para crear, cambiar ni administrar a otros golfistas.
- El golfista puede marcar sus entrenamientos como iniciados o completados y responder mensajes. Las políticas RLS de Supabase limitan todas las lecturas y cambios a la ficha vinculada con su propio correo.
- La última versión consultada del portal se guarda en el dispositivo para poder verla sin conexión. Enviar mensajes, cambiar el estado de un entrenamiento o traer datos nuevos requiere conexión.

Las migraciones de la plataforma dedicada GolfCoach están en [`database/supabase/migrations`](database/supabase/migrations): estructura, endurecimiento del primer entrenador, seguridad adicional e índices. El proyecto de Supabase debe ser exclusivo de GolfCoach; no se deben aplicar estas migraciones a otras apps de VitalCore. En Supabase Auth, Site URL debe ser `https://adanbrilzgolf.com.ar/` y la misma dirección debe figurar en Redirect URLs. La dirección anterior de GitHub Pages puede conservarse temporalmente como redirección adicional durante la transición.

Después de publicar esta versión, el primer entrenador inicia sesión con su mail, elige **Tengo el código del primer entrenador** e ingresa el código único entregado por la persona administradora. Si el dispositivo contiene fichas anteriores, primero debe elegir **Revisar fichas anteriores** y confirmar su vinculación. Luego toca ☁️ y elige **Activar respaldo y sincronizar**. Desde entonces, los cambios del entrenador se encolan localmente y se respaldan al recuperar conexión. El código se consume al activarse; guardalo de forma privada y nunca lo subas al repositorio.

No subas nombres, teléfonos, correos, códigos de activación ni claves administrativas al repositorio: GitHub Pages es público. La app usa solamente una publishable key en el navegador; las políticas RLS de PostgreSQL autorizan cada dato en el servidor.

