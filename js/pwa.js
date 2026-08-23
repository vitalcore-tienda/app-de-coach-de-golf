/**
 * GolfCoach Pro - Experiencia instalable y uso sin conexión
 */

class PWAEngine {
  static deferredInstallPrompt = null;
  static initialized = false;

  static init() {
    if (PWAEngine.initialized) return;
    PWAEngine.initialized = true;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      PWAEngine.deferredInstallPrompt = event;
      PWAEngine.updateInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      PWAEngine.deferredInstallPrompt = null;
      PWAEngine.updateInstallButton();
      PWAEngine.showToast('📲 GolfCoach quedó instalado en este dispositivo.');
    });

    window.addEventListener('online', () => PWAEngine.updateConnectivityStatus());
    window.addEventListener('offline', () => PWAEngine.updateConnectivityStatus());

    PWAEngine.updateInstallButton();
    PWAEngine.updateConnectivityStatus();
    PWAEngine.registerServiceWorker();
  }

  static isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  static updateInstallButton() {
    const button = document.getElementById('install-app-btn');
    if (!button) return;

    const installed = PWAEngine.isStandalone();
    button.hidden = installed;
    button.title = PWAEngine.deferredInstallPrompt
      ? 'Instalar GolfCoach en este dispositivo'
      : 'Ver cómo instalar GolfCoach';
  }

  static async promptInstall() {
    if (PWAEngine.isStandalone()) return;

    if (PWAEngine.deferredInstallPrompt) {
      const prompt = PWAEngine.deferredInstallPrompt;
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        PWAEngine.deferredInstallPrompt = null;
        PWAEngine.updateInstallButton();
      }
      return;
    }

    PWAEngine.showInstallGuide();
  }

  static showInstallGuide() {
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent || !window.App) {
      PWAEngine.showToast('Buscá “Instalar aplicación” o “Agregar a pantalla principal” en el menú del navegador.');
      return;
    }

    const instructions = PWAEngine.isIOS()
      ? `
        <p>En iPhone o iPad, abrí esta página desde <strong>Safari</strong>, tocá el botón <strong>Compartir</strong> y elegí <strong>“Agregar a pantalla de inicio”</strong>.</p>
        <p style="font-size:0.84rem; color:var(--text-muted);">Después se abrirá desde su propio ícono, como una app.</p>
      `
      : `
        <p>En Chrome o Edge, abrí el menú de <strong>tres puntos</strong> y elegí <strong>“Instalar aplicación”</strong> o <strong>“Agregar a pantalla principal”</strong>.</p>
        <p style="font-size:0.84rem; color:var(--text-muted);">Una vez instalada, GolfCoach se abre desde su ícono y conserva las fichas y rondas sin conexión.</p>
      `;

    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-gold">GolfCoach en tu celular</span>
          <h3 style="margin-top:0.3rem;">Instalar la aplicación</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div style="font-size:0.95rem; line-height:1.65; color:var(--text-main);">
        ${instructions}
      </div>
      <div class="offline-info-card" style="margin-top:1rem;">
        <span>📶</span>
        <span>La interfaz y los datos ya abiertos quedan disponibles offline. La sincronización con otros dispositivos requiere conexión.</span>
      </div>
      <button class="btn btn-primary" style="width:100%; margin-top:1.25rem; min-height:46px;" onclick="App.closeModal()">Entendido</button>
    `;
    App.openModal();
  }

  static async registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            PWAEngine.showToast('🔄 Hay una nueva versión lista para usar al volver a abrir la app.');
          }
        });
      });
    } catch (error) {
      // La app sigue siendo utilizable aunque el navegador o file:// no admita workers.
      console.warn('No se pudo registrar el modo offline:', error);
    }
  }

  static updateConnectivityStatus() {
    let status = document.getElementById('network-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'network-status';
      status.className = 'network-status';
      status.setAttribute('role', 'status');
      document.body.appendChild(status);
    }

    const offline = navigator.onLine === false;
    status.hidden = !offline;
    status.innerHTML = offline
      ? '<span>📴</span> Sin conexión: los cambios quedan guardados en este dispositivo.'
      : '';
  }

  static handleLaunchShortcut() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const action = params.get('action');

    if (view === 'players') {
      App.navigateTo('players');
    }
    if (action === 'new-round') {
      const authenticatedWithoutCoachRole = Boolean(
        window.AuthEngine?.user && !window.AuthEngine?.isCoach?.()
      );
      if (window.PlayerPortal?.active || authenticatedWithoutCoachRole) {
        PWAEngine.showToast('La carga de rondas está disponible sólo para el entrenador.');
        return;
      }
      window.setTimeout(() => RoundsEngine.openNewRoundModal(), 120);
    }
  }

  static showToast(message) {
    if (window.App?.showToast) App.showToast(message);
  }
}

window.PWAEngine = PWAEngine;
