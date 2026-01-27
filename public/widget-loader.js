(function() {
  'use strict';

  // Get the current script tag and extract data-id
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var embedCode = currentScript.getAttribute('data-id');
  
  if (!embedCode) {
    console.error('TradeFlow Widget: Missing data-id attribute');
    return;
  }

  // Configuration
  var WIDGET_BASE_URL = 'https://tradeflow-hub-87.lovable.app';
  var API_URL = 'https://rfbkwdpilwmdnaurlxhm.supabase.co/functions/v1';
  var WIDGET_ID = 'tradeflow-widget-' + embedCode;

  // Fetch widget configuration
  fetch(API_URL + '/widget-config?embed_code=' + encodeURIComponent(embedCode))
    .then(function(response) {
      if (!response.ok) throw new Error('Widget not found');
      return response.json();
    })
    .then(function(config) {
      initWidget(config);
    })
    .catch(function(error) {
      console.error('TradeFlow Widget Error:', error.message);
    });

  function initWidget(config) {
    var appearance = config.appearance || {};
    var primaryColor = appearance.primaryColor || '#F97316';
    var buttonText = appearance.buttonText || 'Book Now';
    var buttonPosition = appearance.buttonPosition || 'bottom-right';
    var buttonTextColor = appearance.buttonTextColor || '#FFFFFF';

    // Inject styles
    var style = document.createElement('style');
    style.textContent = '\n' +
      '#' + WIDGET_ID + '-button {\n' +
      '  position: fixed;\n' +
      '  z-index: 999999;\n' +
      '  padding: 14px 28px;\n' +
      '  border: none;\n' +
      '  border-radius: 50px;\n' +
      '  cursor: pointer;\n' +
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n' +
      '  font-size: 16px;\n' +
      '  font-weight: 600;\n' +
      '  box-shadow: 0 4px 14px rgba(0,0,0,0.25);\n' +
      '  transition: transform 0.2s, box-shadow 0.2s;\n' +
      '  background-color: ' + primaryColor + ';\n' +
      '  color: ' + buttonTextColor + ';\n' +
      getPositionStyles(buttonPosition) +
      '}\n' +
      '#' + WIDGET_ID + '-button:hover {\n' +
      '  transform: scale(1.05);\n' +
      '  box-shadow: 0 6px 20px rgba(0,0,0,0.3);\n' +
      '}\n' +
      '#' + WIDGET_ID + '-overlay {\n' +
      '  position: fixed;\n' +
      '  top: 0;\n' +
      '  left: 0;\n' +
      '  width: 100%;\n' +
      '  height: 100%;\n' +
      '  background: rgba(0,0,0,0.5);\n' +
      '  z-index: 9999999;\n' +
      '  display: none;\n' +
      '  align-items: center;\n' +
      '  justify-content: center;\n' +
      '  opacity: 0;\n' +
      '  transition: opacity 0.3s;\n' +
      '}\n' +
      '#' + WIDGET_ID + '-overlay.open {\n' +
      '  display: flex;\n' +
      '  opacity: 1;\n' +
      '}\n' +
      '#' + WIDGET_ID + '-modal {\n' +
      '  background: #fff;\n' +
      '  border-radius: 16px;\n' +
      '  width: 100%;\n' +
      '  max-width: 480px;\n' +
      '  height: 90vh;\n' +
      '  max-height: 700px;\n' +
      '  overflow: hidden;\n' +
      '  box-shadow: 0 25px 50px rgba(0,0,0,0.25);\n' +
      '  transform: translateY(20px);\n' +
      '  transition: transform 0.3s;\n' +
      '}\n' +
      '#' + WIDGET_ID + '-overlay.open #' + WIDGET_ID + '-modal {\n' +
      '  transform: translateY(0);\n' +
      '}\n' +
      '#' + WIDGET_ID + '-close {\n' +
      '  position: absolute;\n' +
      '  top: 12px;\n' +
      '  right: 12px;\n' +
      '  width: 32px;\n' +
      '  height: 32px;\n' +
      '  border: none;\n' +
      '  background: rgba(0,0,0,0.1);\n' +
      '  border-radius: 50%;\n' +
      '  cursor: pointer;\n' +
      '  font-size: 18px;\n' +
      '  display: flex;\n' +
      '  align-items: center;\n' +
      '  justify-content: center;\n' +
      '  color: #333;\n' +
      '  z-index: 10;\n' +
      '}\n' +
      '#' + WIDGET_ID + '-close:hover {\n' +
      '  background: rgba(0,0,0,0.2);\n' +
      '}\n' +
      '#' + WIDGET_ID + '-iframe {\n' +
      '  width: 100%;\n' +
      '  height: 100%;\n' +
      '  border: none;\n' +
      '}\n' +
      '@media (max-width: 520px) {\n' +
      '  #' + WIDGET_ID + '-modal {\n' +
      '    max-width: 100%;\n' +
      '    height: 100%;\n' +
      '    max-height: 100%;\n' +
      '    border-radius: 0;\n' +
      '  }\n' +
      '}\n';
    document.head.appendChild(style);

    // Create floating button
    var button = document.createElement('button');
    button.id = WIDGET_ID + '-button';
    button.textContent = buttonText;
    button.setAttribute('aria-label', 'Open booking widget');
    document.body.appendChild(button);

    // Create modal overlay
    var overlay = document.createElement('div');
    overlay.id = WIDGET_ID + '-overlay';
    overlay.innerHTML = 
      '<div id="' + WIDGET_ID + '-modal" role="dialog" aria-modal="true" style="position: relative;">' +
        '<button id="' + WIDGET_ID + '-close" aria-label="Close booking widget">&times;</button>' +
        '<iframe id="' + WIDGET_ID + '-iframe" src="" title="Booking Widget"></iframe>' +
      '</div>';
    document.body.appendChild(overlay);

    // Event handlers
    var iframe = document.getElementById(WIDGET_ID + '-iframe');
    var closeBtn = document.getElementById(WIDGET_ID + '-close');

    button.addEventListener('click', function() {
      iframe.src = WIDGET_BASE_URL + '/widget/' + embedCode;
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', closeWidget);
    
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeWidget();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        closeWidget();
      }
    });

    // Listen for messages from iframe
    window.addEventListener('message', function(e) {
      if (e.origin !== WIDGET_BASE_URL) return;
      if (e.data && e.data.type === 'tradeflow-widget-close') {
        closeWidget();
      }
    });

    function closeWidget() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(function() {
        iframe.src = '';
      }, 300);
    }
  }

  function getPositionStyles(position) {
    switch (position) {
      case 'bottom-left':
        return '  bottom: 24px;\n  left: 24px;\n';
      case 'top-right':
        return '  top: 24px;\n  right: 24px;\n';
      case 'top-left':
        return '  top: 24px;\n  left: 24px;\n';
      case 'bottom-right':
      default:
        return '  bottom: 24px;\n  right: 24px;\n';
    }
  }
})();
