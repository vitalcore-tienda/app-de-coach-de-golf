/* Lesson calendar. No offline writes: only a committed RPC confirms a booking. */
class CalendarEngine {
  static generation = 0;
  static session = 0;
  static identity = null;
  static adapter = null; // Injected only by the separate local preview.
  static escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  static today() { return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
  static date(value) { return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
  static user() { return CalendarEngine.adapter?.user || window.AuthEngine?.user; }
  static coach() { return CalendarEngine.adapter ? CalendarEngine.adapter.role === 'coach' : window.AuthEngine?.profile?.account_role === 'coach'; }
  static async rpc(name, args = {}) {
    if (navigator.onLine === false) throw new Error('Sin conexión. Volvé a conectarte para consultar o reservar un horario.');
    if (CalendarEngine.adapter) return CalendarEngine.adapter.rpc(name,args);
    if (!CalendarEngine.user() || !AuthEngine.client) throw new Error('Ingresá por correo para abrir tu agenda.');
    const {data,error} = await AuthEngine.client.rpc(name,args);
    if (error) {
      if (['PGRST202','42883','42P01'].includes(error.code)) throw new Error('La agenda no está disponible en el servidor. Intentá nuevamente más tarde o contactá a tu profesor.');
      if (['23514','23502','22P02','22003'].includes(error.code)) throw new Error('Revisá los valores de los campos. Hay un dato inválido o fuera de rango.');
      throw new Error(error.message || 'No se pudo consultar la agenda. Intentá nuevamente.');
    }
    return data;
  }
  static onIdentityChanged() {
    if (CalendarEngine.identity && (CalendarEngine.identity !== CalendarEngine.user()?.id || CalendarEngine.identityRole !== CalendarEngine.coach())) App.closeModal();
  }
  static async open() {
    if (!CalendarEngine.user()) { App.toast('Ingresá por correo para abrir tu agenda.','warning'); return; }
    CalendarEngine.identity = CalendarEngine.user().id;
    CalendarEngine.identityRole = CalendarEngine.coach();
    CalendarEngine.session++;
    CalendarEngine.replacing = null;
    CalendarEngine.request = null;
    CalendarEngine.firstDay = CalendarEngine.today();
    CalendarEngine.days = 7;
    CalendarEngine.busy = false;
    const host = document.getElementById('global-modal-content');
    host.classList.add('calendar-modal');
    host.innerHTML = `<div class="calendar-head"><div><span class="calendar-eyebrow">CLASES INDIVIDUALES</span><h2 id="calendar-title">${CalendarEngine.coach()?'Agenda del profesor':'Reservar una clase'}</h2></div><button type="button" class="modal-close" onclick="App.requestModalClose()" aria-label="Cerrar agenda">×</button></div>
      <p>Horarios de Argentina · Reservas con conexión · Hasta 90 días de anticipación</p>
      <p id="calendar-status" role="status" aria-live="polite"></p><div id="calendar-body" aria-busy="true">Cargando agenda…</div>`;
    App.setModalCleanup(() => { CalendarEngine.session++; CalendarEngine.generation++; CalendarEngine.identity=null; CalendarEngine.context=null; host.classList.remove('calendar-modal'); });
    App.openModal();
    await CalendarEngine.load();
  }
  static current(g) { return g===CalendarEngine.generation && CalendarEngine.identity===CalendarEngine.user()?.id && !!CalendarEngine.identity; }
  static status(message,error=false) { const el=document.getElementById('calendar-status'); if(el){el.textContent=message;el.className=error?'calendar-error':'calendar-notice';} }
  static async load(message='') {
    const g=++CalendarEngine.generation;
    try {
      const context=await CalendarEngine.rpc('lesson_context');
      if(!CalendarEngine.current(g)) return;
      CalendarEngine.context=context;
      CalendarEngine.selectedCoach=context.coaches.find(c=>c.id===CalendarEngine.selectedCoach)?.id || context.coaches[0]?.id;
      CalendarEngine.render();
      document.getElementById('calendar-body').setAttribute('aria-busy','false');
      CalendarEngine.status(message);
      await CalendarEngine.slots();
    } catch(e) {
      if(!CalendarEngine.current(g)) return;
      CalendarEngine.status(e.message,true);
      document.getElementById('calendar-body').innerHTML='<button type="button" class="btn btn-secondary" id="calendar-retry">Reintentar</button>';
      document.getElementById('calendar-retry').onclick=()=>CalendarEngine.load();
    } finally { if(CalendarEngine.current(g)) document.getElementById('calendar-body')?.setAttribute('aria-busy','false'); }
  }
  static render() {
    const E=CalendarEngine.escape, ctx=CalendarEngine.context, coach=CalendarEngine.coach();
    const selected=ctx.coaches.find(c=>c.id===CalendarEngine.selectedCoach);
    const settings=selected?.settings;
    document.getElementById('calendar-body').innerHTML=`
      ${!selected?'<div class="calendar-card">Tu profesor debe vincular tu correo a una ficha sincronizada para habilitar las reservas.</div>':`
      <label class="calendar-field">Profesor<select id="calendar-coach">${ctx.coaches.map(c=>`<option value="${E(c.id)}" ${c.id===selected.id?'selected':''}>${E(c.name)}</option>`).join('')}</select></label>
      <div class="calendar-card"><strong>${settings?.enabled?'Agenda abierta':'Agenda todavía no disponible'}</strong>
      <p>${settings?`${settings.duration} minutos · ${settings.buffer} min entre clases · ${E(settings.location || 'Lugar a coordinar')}${settings.price!==null?` · ARS ${E(settings.price)}`:''}`:'El profesor todavía no configuró sus horarios.'}</p>
      <p>Cancelación y reprogramación hasta ${settings?.cancellation_hours??24} horas antes. Anticipación mínima para reservar: 1 hora.</p></div>
      ${coach?CalendarEngine.settingsForm(settings,selected.blocks):''}
      <div class="calendar-toolbar"><label class="calendar-field">Desde<input id="calendar-day" type="date" value="${CalendarEngine.firstDay}" min="${CalendarEngine.today()}"></label>
      <label class="calendar-field">Vista<select id="calendar-days"><option value="1" ${CalendarEngine.days===1?'selected':''}>Día</option><option value="7" ${CalendarEngine.days===7?'selected':''}>Semana</option></select></label>
      <button type="button" class="btn btn-secondary" id="calendar-refresh">Actualizar</button></div>
      ${CalendarEngine.replacing?'<p class="calendar-notice">Elegí el nuevo horario. Tu reserva actual se conserva hasta confirmar el cambio.</p><button type="button" class="btn btn-secondary" id="calendar-abort">Salir de reprogramación</button>':''}
      <h3 id="calendar-slot-heading">${coach?'Horarios que verán tus alumnos':'Horarios disponibles'}</h3><div id="calendar-slots" class="calendar-slots" aria-live="polite">Consultando…</div><div id="calendar-confirm"></div>`}
      <section id="calendar-bookings-section"><h3>${coach?'Clases del período seleccionado':'Mis próximas clases'}</h3><p id="calendar-period-empty" hidden>No hay clases en este período.</p><div class="calendar-bookings">${ctx.bookings.length?ctx.bookings.map(b=>{
        const editable=b.status==='confirmed' && new Date(b.starts_at)>new Date(Date.now()+(coach?0:b.cancellation_hours*3600000));
        return `<article class="calendar-card" data-booking-start="${E(b.starts_at)}"><strong>${E(CalendarEngine.date(b.starts_at))}</strong><p>${coach?E(b.student_name):E(ctx.coaches.find(c=>c.id===b.coach_id)?.name || 'Profesor')} · ${b.status==='confirmed'?'Confirmada':'Cancelada'}</p><p>${E(b.location || 'Lugar a coordinar')} · ${Math.round((new Date(b.ends_at)-new Date(b.starts_at))/60000)} min${b.price!==null?` · ARS ${E(b.price)}`:''}</p>${b.notes?`<p>Nota del alumno: ${E(b.notes)}</p>`:''}<small>${b.mail_status==='sent'?'Avisos enviados':b.mail_status==='failed'?'La clase está guardada; el envío de avisos necesita revisión.':'Avisos pendientes de envío; la reserva ya está guardada.'}</small>
        ${editable?`<div class="calendar-actions">${!coach?`<button type="button" class="btn btn-secondary" data-reschedule="${E(b.id)}">Reprogramar</button>`:''}<button type="button" class="btn btn-secondary" data-cancel="${E(b.id)}">Cancelar clase</button></div>`:b.status==='confirmed'?'<p>Para cambios fuera de plazo, contactá a tu profesor.</p>':''}</article>`;
      }).join(''):'<p>Todavía no hay clases agendadas.</p>'}</div></section>`;
    const byId=id=>document.getElementById(id);
    if(coach && selected) byId('calendar-body').insertBefore(byId('calendar-bookings-section'),byId('calendar-slot-heading'));
    if(selected){
      byId('calendar-coach').onchange=e=>{CalendarEngine.selectedCoach=e.target.value;CalendarEngine.replacing=null;CalendarEngine.request=null;CalendarEngine.render();CalendarEngine.slots();};
      byId('calendar-day').onchange=e=>{if(e.target.value){CalendarEngine.firstDay=e.target.value;CalendarEngine.slots();}};
      byId('calendar-days').onchange=e=>{CalendarEngine.days=Number(e.target.value);CalendarEngine.slots();};
      byId('calendar-refresh').onclick=()=>CalendarEngine.load();
      if(byId('calendar-abort')) byId('calendar-abort').onclick=()=>{CalendarEngine.replacing=null;CalendarEngine.render();CalendarEngine.slots();};
      if(coach) CalendarEngine.bindSettings();
    }
    document.querySelectorAll('[data-reschedule]').forEach(btn=>btn.onclick=()=>{
      const b=ctx.bookings.find(b=>b.id===btn.dataset.reschedule);
      CalendarEngine.replacing=b.id;CalendarEngine.selectedCoach=b.coach_id;CalendarEngine.request=null;
      CalendarEngine.render();CalendarEngine.slots();byId('calendar-day').focus();
    });
    document.querySelectorAll('[data-cancel]').forEach(btn=>btn.onclick=()=>{
      if(!confirm('¿Cancelar esta clase? Se liberará el horario y se prepararán avisos para ambos.')) return;
      CalendarEngine.mutate('lesson_cancel',{booking:btn.dataset.cancel},'Clase cancelada. Los avisos quedaron pendientes de envío.');
    });
  }
  static async slots() {
    const el=document.getElementById('calendar-slots'); if(!el)return;
    const g=++CalendarEngine.generation;
    if(CalendarEngine.coach()) {
      const begin=new Date(`${CalendarEngine.firstDay}T00:00:00-03:00`).getTime(),end=begin+CalendarEngine.days*86400000;
      const cards=[...document.querySelectorAll('[data-booking-start]')];
      cards.forEach(card=>{const time=new Date(card.dataset.bookingStart).getTime();card.hidden=time<begin||time>=end;});
      document.getElementById('calendar-period-empty').hidden=!cards.length||cards.some(card=>!card.hidden);
    }
    el.textContent='Consultando horarios…';
    document.getElementById('calendar-confirm').innerHTML='';
    try {
      const slots=await CalendarEngine.rpc('lesson_available',{c:CalendarEngine.selectedCoach,first_day:CalendarEngine.firstDay,days:CalendarEngine.days,excluding:CalendarEngine.replacing});
      if(!CalendarEngine.current(g))return;
      el.innerHTML=slots.length?slots.map(s=>`<button type="button" class="btn btn-secondary" data-slot="${CalendarEngine.escape(s.starts_at)}">${CalendarEngine.escape(CalendarEngine.date(s.starts_at))}</button>`).join(''):'<p>No hay horarios libres en este período. Probá otra fecha o consultá a tu profesor.</p>';
      el.querySelectorAll('[data-slot]').forEach(btn=>btn.onclick=()=>{if(CalendarEngine.coach()){CalendarEngine.status('Estos son los horarios disponibles para tus alumnos. Las reservas se confirman desde su cuenta.');return;}CalendarEngine.confirmSlot(btn.dataset.slot);});
    } catch(e){if(CalendarEngine.current(g)){el.textContent='No pudimos obtener disponibilidad.';CalendarEngine.status(e.message,true);}}
  }
  static confirmSlot(start) {
    const E=CalendarEngine.escape;
    const previous=CalendarEngine.context.bookings.find(b=>b.id===CalendarEngine.replacing);
    // Reuse key for the same pending request after a lost HTTP response.
    const key=`${CalendarEngine.selectedCoach}|${start}|${CalendarEngine.replacing||''}`;
    if(CalendarEngine.request?.key!==key) CalendarEngine.request={key,id:crypto.randomUUID()};
    document.getElementById('calendar-confirm').innerHTML=`<form id="calendar-book-form" class="calendar-card"><h3>${CalendarEngine.replacing?'Confirmar cambio':'Confirmar reserva'}</h3><p>${E(CalendarEngine.date(start))}</p><label class="calendar-field">Nota para el profesor (opcional)<textarea name="note" maxlength="500" rows="2">${E(previous?.notes||'')}</textarea></label><button class="btn btn-primary" type="submit">${CalendarEngine.replacing?'Confirmar reprogramación':'Confirmar reserva'}</button><p>El correo es un aviso: la confirmación válida aparece en tu agenda.</p></form>`;
    document.getElementById('calendar-book-form').onsubmit=e=>{e.preventDefault();CalendarEngine.mutate('lesson_book',{c:CalendarEngine.selectedCoach,start_time:start,request:CalendarEngine.request.id,note:new FormData(e.target).get('note'),replacing:CalendarEngine.replacing},'Clase confirmada. Avisos preparados para vos y tu profesor.');};
    document.querySelector('#calendar-book-form textarea').focus();
  }
  static async mutate(name,args,message) {
    if(CalendarEngine.busy)return;
    CalendarEngine.busy=true;
    const g=CalendarEngine.generation;
    const session=CalendarEngine.session;
    document.querySelectorAll('#calendar-body button, #calendar-body input, #calendar-body select, #calendar-body textarea').forEach(e=>e.disabled=true);
    CalendarEngine.status('Guardando… No cierres la agenda.');
    try {
      await CalendarEngine.rpc(name,args);
      if(!CalendarEngine.current(g))return;
      CalendarEngine.replacing=null;CalendarEngine.request=null;
      await CalendarEngine.load(message);
    } catch(e){if(CalendarEngine.current(g)) CalendarEngine.status(`${e.message} Si se cortó la conexión al confirmar, actualizá la agenda antes de intentar otro horario.`,true);}
    finally {if(session===CalendarEngine.session){CalendarEngine.busy=false;if(CalendarEngine.identity)document.querySelectorAll('#calendar-body :disabled').forEach(e=>e.disabled=false);}}
  }
  static settingsForm(s,blocks=[]) {
    s=s||{enabled:false,duration:60,buffer:15,cancellation_hours:24,location:'',price:null,weekly:[]};
    const E=CalendarEngine.escape,time=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    return `<details class="calendar-card"><summary>Configurar disponibilidad y fechas bloqueadas</summary><form id="calendar-settings"><div class="calendar-fields">
      <label class="calendar-field">Duración (min)<input name="duration" type="number" min="15" max="180" required value="${s.duration}"></label>
      <label class="calendar-field">Pausa entre clases (min)<input name="buffer" type="number" min="0" max="120" required value="${s.buffer}"></label>
      <label class="calendar-field">Anticipación para cancelar (horas)<input name="cancellation_hours" type="number" min="0" max="168" required value="${s.cancellation_hours}"></label>
      <label class="calendar-field">Precio en ARS (opcional)<input name="price" type="number" min="0" max="9999999999" step="0.01" value="${s.price??''}"></label>
      <label class="calendar-field">Lugar<input name="location" maxlength="200" value="${E(s.location)}"></label></div>
      <fieldset><legend>Horario semanal · un tramo por día</legend>${['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((day,dow)=>{const w=s.weekly.find(w=>w.dow===dow);return `<div class="calendar-week-row"><label><input type="checkbox" name="day${dow}" ${w?'checked':''}> ${day}</label><input aria-label="Inicio ${day}" name="start${dow}" type="time" required value="${time(w?.start_min??540)}"><input aria-label="Fin ${day}" name="end${dow}" type="time" required value="${time(w?.end_min??1080)}"></div>`;}).join('')}</fieldset>
      <label class="calendar-check"><input name="enabled" type="checkbox" ${s.enabled?'checked':''}> Permitir nuevas reservas</label><p>Las clases ya confirmadas conservan su duración, lugar, precio y plazo de cancelación.</p><button class="btn btn-primary" type="submit">Guardar disponibilidad</button></form>
      <form id="calendar-block-form"><label class="calendar-field">Bloquear un día completo<input name="day" type="date" min="${CalendarEngine.today()}" required></label><button class="btn btn-secondary" type="submit">Bloquear fecha</button></form>
      <div class="calendar-actions">${blocks.map(day=>`<button type="button" class="btn btn-secondary" data-unblock="${E(day)}">Habilitar ${E(day)}</button>`).join('')}</div></details>`;
  }
  static bindSettings() {
    document.getElementById('calendar-settings').onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.target),weekly=[];
      const minutes=v=>{const [h,m]=v.split(':').map(Number);return h*60+m;};
      for(let dow=0;dow<7;dow++)if(f.has(`day${dow}`)){
        const start_min=minutes(f.get(`start${dow}`)),end_min=minutes(f.get(`end${dow}`));
        if(end_min-start_min<Number(f.get('duration'))){CalendarEngine.status('Cada día habilitado debe tener tiempo para una clase completa.',true);return;}
        weekly.push({dow,start_min,end_min});
      }
      CalendarEngine.mutate('lesson_save_settings',{config:{enabled:f.has('enabled'),duration:Number(f.get('duration')),buffer:Number(f.get('buffer')),cancellation_hours:Number(f.get('cancellation_hours')),location:f.get('location'),price:f.get('price')===''?null:Number(f.get('price')),weekly}},'Disponibilidad guardada.');
    };
    document.getElementById('calendar-block-form').onsubmit=e=>{e.preventDefault();CalendarEngine.mutate('lesson_block',{day:new FormData(e.target).get('day'),remove:false},'Fecha bloqueada.');};
    document.querySelectorAll('[data-unblock]').forEach(btn=>btn.onclick=()=>CalendarEngine.mutate('lesson_block',{day:btn.dataset.unblock,remove:true},'Fecha habilitada.'));
  }
}
window.CalendarEngine=CalendarEngine;
