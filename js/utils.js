/**
 * Utilidades compartidas de GolfCoach Pro.
 */
class GolfUtils {
  static localDateISO(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) throw new Error('La fecha no es válida.');
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

window.GolfUtils = GolfUtils;

/**
 * Ayudas de accesibilidad compartidas por la SPA y sus ventanas.
 */
class GolfA11y {
  static prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  static scrollBehavior() {
    return GolfA11y.prefersReducedMotion() ? 'auto' : 'smooth';
  }

  static announce(message, targetId = 'route-announcer') {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.textContent = '';
    window.requestAnimationFrame(() => {
      target.textContent = String(message || '');
    });
  }

  static focusable(container) {
    if (!container) return [];
    return [...container.querySelectorAll([
      'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ].join(','))].filter((element) => !element.hidden && element.getClientRects().length > 0);
  }

  static trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) return;
    const focusable = GolfA11y.focusable(container);
    if (!focusable.length) {
      event.preventDefault();
      container.focus?.();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

window.GolfA11y = GolfA11y;

/**
 * Comportamiento compartido para los formularios de las ventanas de la app.
 * Mantiene la validación cerca del campo y evita que cada módulo implemente
 * estados de error y carga de una manera diferente.
 */
class GolfForm {
  static containerSelector = '.app-form';

  static controlSelector = [
    'input.form-control:not([type="hidden"])',
    'select.form-control',
    'textarea.form-control'
  ].join(',');

  static enhance(root = document) {
    const containers = [];
    if (root?.nodeType === Node.ELEMENT_NODE && root.matches?.(GolfForm.containerSelector)) containers.push(root);
    root?.querySelectorAll?.(GolfForm.containerSelector).forEach((container) => containers.push(container));

    containers.forEach((container) => {
      if (container.tagName === 'FORM') container.noValidate = true;
      container.closest?.('.modal-box')?.classList.add('form-modal');
      container.querySelectorAll(GolfForm.controlSelector).forEach((control) => GolfForm.bindControl(control));
    });
  }

  static bindControl(control) {
    if (!control?.id || control.dataset.formValidationBound === 'true') return;
    control.dataset.formValidationBound = 'true';
    const group = control.closest('.form-group');
    if (!group) return;

    let error = group.querySelector('.field-error');
    if (!error) {
      error = document.createElement('div');
      error.className = 'field-error';
      error.id = `${control.id}-error`;
      error.setAttribute('aria-live', 'polite');
      group.append(error);
    }
    control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));

    control.addEventListener('blur', () => {
      control.dataset.formTouched = 'true';
      GolfForm.validateField(control, { force: true });
    });
    const refresh = () => {
      if (control.dataset.formCustomError === 'true') {
        control.setCustomValidity('');
        delete control.dataset.formCustomError;
      }
      if (control.dataset.formTouched === 'true' || control.getAttribute('aria-invalid') === 'true') {
        GolfForm.validateField(control, { force: true });
      }
    };
    control.addEventListener('input', refresh);
    control.addEventListener('change', refresh);
  }

  static validationMessage(control) {
    const validity = control?.validity;
    if (!validity) return 'Revisá este campo.';
    if (validity.customError) return control.validationMessage || 'Revisá este campo.';
    if (validity.valueMissing) return control.dataset.requiredMessage || 'Completá este campo.';
    if (validity.typeMismatch && control.type === 'email') return 'Ingresá un correo válido.';
    if (validity.rangeUnderflow) return `El valor mínimo es ${control.min}.`;
    if (validity.rangeOverflow) return `El valor máximo es ${control.max}.`;
    if (validity.stepMismatch) return 'Ingresá un valor permitido.';
    if (validity.tooLong) return `Usá hasta ${control.maxLength} caracteres.`;
    if (validity.tooShort) return `Usá al menos ${control.minLength} caracteres.`;
    if (validity.badInput) return 'Ingresá un valor válido.';
    return control.validationMessage || 'Revisá este campo.';
  }

  static validateField(control, { force = false } = {}) {
    if (!control || control.disabled) return true;
    GolfForm.bindControl(control);
    const group = control.closest('.form-group');
    const error = group?.querySelector('.field-error');
    const valid = control.checkValidity();
    const shouldShow = force || control.dataset.formTouched === 'true';

    if (valid) {
      control.removeAttribute('aria-invalid');
      group?.classList.remove('has-error');
      if (error) error.textContent = '';
      return true;
    }

    if (shouldShow) {
      control.setAttribute('aria-invalid', 'true');
      group?.classList.add('has-error');
      if (error) error.textContent = GolfForm.validationMessage(control);
    }
    return false;
  }

  static validate(container) {
    if (!container) return false;
    GolfForm.enhance(container);
    const controls = [...container.querySelectorAll(GolfForm.controlSelector)];
    const invalid = controls.filter((control) => !GolfForm.validateField(control, { force: true }));
    if (invalid.length) {
      invalid[0].focus({ preventScroll: true });
      invalid[0].scrollIntoView({ behavior: GolfA11y.scrollBehavior(), block: 'center' });
    }
    return invalid.length === 0;
  }

  static setCustomError(control, message = '') {
    if (!control) return;
    control.setCustomValidity(message);
    if (message) control.dataset.formCustomError = 'true';
    else delete control.dataset.formCustomError;
    GolfForm.validateField(control, { force: Boolean(message) });
  }

  static setStatus(statusOrId, message = '', type = 'neutral') {
    const status = typeof statusOrId === 'string' ? document.getElementById(statusOrId) : statusOrId;
    if (!status) return;
    status.textContent = message;
    status.classList.remove('error', 'success');
    if (message && (type === 'error' || type === 'success')) status.classList.add(type);
  }

  static setBusy(button, busy, busyLabel = 'Guardando…') {
    if (!button) return;
    if (busy) {
      if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent.trim();
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = busyLabel;
      button.replaceChildren(spinner, label);
      return;
    }
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.idleLabel) {
      button.textContent = button.dataset.idleLabel;
      delete button.dataset.idleLabel;
    }
  }
}

window.GolfForm = GolfForm;

/**
 * Estados visuales compartidos para cargas asíncronas.
 * Los esqueletos no simulan datos: solo reservan el espacio mientras la app
 * abre IndexedDB o espera una respuesta autenticada de Supabase.
 */
class GolfUI {
  static line(width = '100%', className = '') {
    return `<span class="skeleton-line ${className}" style="--skeleton-width:${width};"></span>`;
  }

  static card({ lines = 3, compact = false } = {}) {
    const widths = ['62%', '100%', '78%', '48%'];
    return `
      <div class="card skeleton-card ${compact ? 'skeleton-card-compact' : ''}" aria-hidden="true">
        <div class="skeleton-card-heading">
          <span class="skeleton-icon"></span>
          ${GolfUI.line('46%', 'skeleton-title')}
        </div>
        ${Array.from({ length: lines }, (_, index) => GolfUI.line(widths[index % widths.length])).join('')}
      </div>
    `;
  }

  static loading(kind = 'cards', label = 'Cargando información…') {
    const cards = kind === 'portal'
      ? `
        <div class="card skeleton-hero" aria-hidden="true">
          <div>${GolfUI.line('28%', 'skeleton-kicker')}${GolfUI.line('58%', 'skeleton-heading')}${GolfUI.line('76%')}</div>
          <span class="skeleton-action"></span>
        </div>
        <div class="grid-4 skeleton-kpi-grid" aria-hidden="true">
          ${Array.from({ length: 4 }, () => GolfUI.card({ lines: 2, compact: true })).join('')}
        </div>
        <div class="grid-2" aria-hidden="true">${GolfUI.card()}${GolfUI.card()}</div>
      `
      : kind === 'messages'
        ? `
          <div class="card skeleton-hero" aria-hidden="true">
            <div>${GolfUI.line('24%', 'skeleton-kicker')}${GolfUI.line('52%', 'skeleton-heading')}${GolfUI.line('70%')}</div>
          </div>
          <div class="coach-messages-grid" aria-hidden="true">${GolfUI.card({ lines: 2 })}${GolfUI.card({ lines: 2 })}${GolfUI.card({ lines: 2 })}</div>
        `
        : kind === 'thread'
          ? `<div class="skeleton-thread" aria-hidden="true">${GolfUI.line('68%')}${GolfUI.line('52%')}${GolfUI.line('74%')}</div>`
          : `
            <div class="card skeleton-hero" aria-hidden="true">
              <div>${GolfUI.line('26%', 'skeleton-kicker')}${GolfUI.line('48%', 'skeleton-heading')}${GolfUI.line('72%')}</div>
              <span class="skeleton-action"></span>
            </div>
            <div class="grid-2" aria-hidden="true">${GolfUI.card()}${GolfUI.card()}</div>
          `;

    return `<section class="loading-skeleton" role="status" aria-live="polite" aria-busy="true"><span class="sr-only">${label}</span>${cards}</section>`;
  }
}

window.GolfUI = GolfUI;
