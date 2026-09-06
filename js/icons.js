/**
 * GolfCoach Pro - consistent SVG interface iconography.
 *
 * Interface emojis are upgraded to a single stroke-based family. Text written
 * by coaches and players is explicitly excluded so personal emoji remain
 * untouched inside conversations and notes.
 */
class GolfIcons {
  static icons = Object.freeze({
    activity: '<path d="M3 12h4l2.2-6 4.2 12 2.3-6H21"/>',
    alert: '<path d="M10.3 3.6 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v17H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5Z"/>',
    brain: '<path d="M9.5 4.5A3 3 0 0 0 4 6a3 3 0 0 0 .5 5.5A3 3 0 0 0 8 16v1a3 3 0 0 0 3 3V4a2.5 2.5 0 0 0-1.5.5Z"/><path d="M14.5 4.5A3 3 0 0 1 20 6a3 3 0 0 1-.5 5.5A3 3 0 0 1 16 16v1a3 3 0 0 1-3 3V4a2.5 2.5 0 0 1 1.5.5Z"/><path d="M8 9h3M13 12h3M7 15h2M15 7h2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4"/>',
    cloud: '<path d="M17.5 19H6a4 4 0 0 1-.5-8A6.5 6.5 0 0 1 18 9a5 5 0 0 1-.5 10Z"/>',
    coffee: '<path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M16 10h2a3 3 0 0 1 0 6h-2M7 3v2M11 3v2"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/>',
    dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    flask: '<path d="M9 3h6M10 3v6l-5.5 9.2A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.8L14 9V3"/><path d="M7 15h10"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
    golf: '<path d="M7 21h10M12 21V4"/><path d="m12 4 7 3-7 3"/><circle cx="7" cy="18" r="1.5"/>',
    golfer: '<circle cx="10" cy="4" r="2"/><path d="m9 7 3 4 4 2M12 11l-3 4-1 6M12 11l3 4 2 5M16 13l4-8"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-6h6v6"/>',
    leaf: '<path d="M20 4C12 4 5 8 5 15a5 5 0 0 0 5 5c7 0 10-8 10-16Z"/><path d="M4 21c3-5 7-8 12-11"/>',
    lightbulb: '<path d="M9 18h6M10 22h4"/><path d="M8.2 14.5A7 7 0 1 1 15.8 14.5 5 5 0 0 0 14 18h-4a5 5 0 0 0-1.8-3.5Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    lungs: '<path d="M10 4v7c0 2-1 3-2 3H5c-2 0-3 2-3 4 0 2 1 3 3 3 3 0 5-2 5-5"/><path d="M14 4v7c0 2 1 3 2 3h3c2 0 3 2 3 4 0 2-1 3-3 3-3 0-5-2-5-5"/><path d="M10 8 8 6M14 8l2-2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    mapPin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    message: '<path d="M21 12a8 8 0 0 1-8 8H5l-3 2 1-5a8 8 0 1 1 18-5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    octagon: '<path d="m7.5 3-4.5 4.5v9L7.5 21h9l4.5-4.5v-9L16.5 3Z"/><path d="M12 8v5M12 17h.01"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    pauseSquare: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 8v8M15 8v8"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 2M17.9 15A7 7 0 0 1 6 18l-2-2"/>',
    ruler: '<path d="m4 17 13-13 3 3L7 20Z"/><path d="m14 7 3 3M11 10l2 2M8 13l3 3"/>',
    save: '<path d="M5 3h12l3 3v15H4V4a1 1 0 0 1 1-1Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/>',
    sparkles: '<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7ZM5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5v2M17.5 7.5 19 6M12 13l3-2"/>',
    trendUp: '<path d="M3 17 9 11l4 4 8-9"/><path d="M15 6h6v6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a6 6 0 0 1 4 6"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M2 9a15 15 0 0 1 20 0"/>',
    wifiOff: '<path d="m3 3 18 18M8.5 16a5 5 0 0 1 4.5-1.4M5 12.5a10 10 0 0 1 3-1.9M14.5 10.5a10 10 0 0 1 4.5 2M2 9a15 15 0 0 1 3-1.5M10 6.2A15 15 0 0 1 22 9M12 20h.01"/>',
    wind: '<path d="M3 8h10a2.5 2.5 0 1 0-2.4-3M3 12h15a2.5 2.5 0 1 1-2.4 3M3 16h7"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>'
  });

  static emojiMap = Object.freeze({
    '🏌️‍♂️': 'golfer', '🏌️': 'golfer', '🏌': 'golfer', '⛳': 'golf', '🎯': 'target',
    '💬': 'message', '🧪': 'flask', '💡': 'lightbulb', '➕': 'plus', '✅': 'check', '✓': 'check', '○': 'circle',
    '☁️': 'cloud', '☁': 'cloud', '📈': 'trendUp', '📊': 'chart', '✉️': 'mail', '✉': 'mail', '📋': 'clipboard',
    '☀️': 'sun', '☀': 'sun', '🌙': 'moon', '📅': 'calendar', '👤': 'user', '👥': 'users', '🏠': 'home',
    '🔐': 'lock', '🔒': 'lock', '🔄': 'refresh', '🧘': 'focus', '💨': 'wind', '🌬️': 'wind', '🌬': 'wind',
    '🏆': 'trophy', '💾': 'save', '✨': 'sparkles', '🎉': 'sparkles', '📝': 'edit', '✏️': 'edit', '✏': 'edit',
    '📖': 'book', '📴': 'wifiOff', '📶': 'wifi', '⚠️': 'alert', '⚠': 'alert', '📲': 'download', '📐': 'ruler',
    '🧠': 'brain', '☰': 'menu', '🏖️': 'golf', '🏖': 'golf', '💪': 'dumbbell', '☕': 'coffee', '🔔': 'bell',
    '🫁': 'lungs', '⚡': 'zap', '🔗': 'link', '📍': 'mapPin', '🎛️': 'sliders', '🎛': 'sliders',
    '🛡️': 'shield', '🛡': 'shield', '🛑': 'octagon', '📏': 'ruler', '🌿': 'leaf', '⚙️': 'settings', '⚙': 'settings',
    '▶': 'play', '⏸️': 'pause', '⏸': 'pause', '⏹️': 'pauseSquare', '⏹': 'pauseSquare', '⏱️': 'timer', '⏱': 'timer'
  });

  static targetSelector = [
    'button', '.brand-badge', '.nav-icon', '.topbar-action-icon', '.workspace-context-icon',
    '.bottom-nav-icon', '.card-icon', '.badge', '.demo-mode-notice-icon', '.onboarding-step-number',
    '.onboarding-check-icon', '.stat-sub', '.toast', '.offline-info-card', '#network-status',
    '#breathing-instruction-text', '.icon-heading', '.ui-icon-copy', '.filter-pill', '.portal-item-meta',
    '.player-avatar', '.scorecard-table td'
  ].join(',');

  static preserveSelector = [
    'input', 'textarea', 'option', 'script', 'style', 'pre', 'code',
    '.portal-message-body', '.chat-bubble', '.preserve-emoji', '[data-preserve-emoji]'
  ].join(',');

  static observer = null;

  static svg(name, className = '') {
    const paths = GolfIcons.icons[name];
    if (!paths) return '';
    const classes = `ui-icon${className ? ` ${className}` : ''}`;
    return `<svg class="${classes}" data-ui-icon="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  static element(name) {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = GolfIcons.svg(name);
    return wrapper.firstElementChild;
  }

  static emojiPattern() {
    const escaped = Object.keys(GolfIcons.emojiMap)
      .sort((a, b) => b.length - a.length)
      .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(escaped.join('|'), 'gu');
  }

  static isPreserved(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest?.(GolfIcons.preserveSelector));
  }

  static replaceTextNode(textNode) {
    if (!textNode?.nodeValue || GolfIcons.isPreserved(textNode)) return;
    const pattern = GolfIcons.emojiPattern();
    const text = textNode.nodeValue;
    const matches = [...text.matchAll(pattern)];
    if (!matches.length) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach((match) => {
      if (match.index > cursor) fragment.append(document.createTextNode(text.slice(cursor, match.index)));
      const iconName = GolfIcons.emojiMap[match[0]];
      const icon = GolfIcons.element(iconName);
      if (icon) fragment.append(icon);
      else fragment.append(document.createTextNode(match[0]));
      cursor = match.index + match[0].length;
    });
    if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
    textNode.replaceWith(fragment);
  }

  static processTarget(element) {
    if (!element || GolfIcons.isPreserved(element)) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => GolfIcons.isPreserved(node) || node.parentElement?.closest?.('svg')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => GolfIcons.replaceTextNode(node));
  }

  static hydratePlaceholders(root) {
    const placeholders = [];
    if (root?.nodeType === Node.ELEMENT_NODE && root.matches?.('[data-icon]:not([data-ui-icon])')) placeholders.push(root);
    root?.querySelectorAll?.('[data-icon]:not([data-ui-icon])').forEach((element) => placeholders.push(element));
    placeholders.forEach((placeholder) => {
      const icon = GolfIcons.element(placeholder.dataset.icon);
      if (!icon) return;
      placeholder.replaceChildren(icon);
      placeholder.dataset.uiIconReady = 'true';
    });
  }

  static enhance(root = document) {
    GolfIcons.hydratePlaceholders(root);
    const targets = [];
    if (root?.nodeType === Node.ELEMENT_NODE && root.matches?.(GolfIcons.targetSelector)) targets.push(root);
    root?.querySelectorAll?.(GolfIcons.targetSelector).forEach((element) => targets.push(element));
    targets.forEach((element) => GolfIcons.processTarget(element));

    const spans = [];
    if (root?.nodeType === Node.ELEMENT_NODE && root.matches?.('span')) spans.push(root);
    root?.querySelectorAll?.('span').forEach((span) => spans.push(span));
    const pattern = GolfIcons.emojiPattern();
    spans.forEach((span) => {
      if (GolfIcons.isPreserved(span) || span.children.length) return;
      pattern.lastIndex = 0;
      if (pattern.test(span.textContent || '')) GolfIcons.processTarget(span);
    });
  }

  static init() {
    if (GolfIcons.observer || !document.body) return;
    GolfIcons.enhance(document);
    GolfIcons.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent?.matches?.(GolfIcons.targetSelector) || parent?.closest?.(GolfIcons.targetSelector)) {
            GolfIcons.enhance(parent.closest(GolfIcons.targetSelector) || parent);
          }
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) GolfIcons.enhance(node);
          if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            if (parent?.matches?.(GolfIcons.targetSelector) || parent?.closest?.(GolfIcons.targetSelector)) {
              GolfIcons.enhance(parent.closest(GolfIcons.targetSelector) || parent);
            }
          }
        });
      });
    });
    GolfIcons.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
}

window.GolfIcons = GolfIcons;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => GolfIcons.init(), { once: true });
else GolfIcons.init();
