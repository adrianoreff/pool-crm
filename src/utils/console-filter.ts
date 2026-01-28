/**
 * Console filter to suppress known browser extension and framework errors
 * that are not related to the application code
 */

const IGNORED_ERRORS = [
  // Bitwarden extension errors
  'Duplicate script ID',
  'fido2-page-script-registration',
  'Unable to fetch ServerConfig',
  'decrypt_with_key',
  'bitwarden_crypto',
  'Environment did not respond in time',
  'Migrator',
  'State version',
  'WASM SDK',
  'WebAssembly is supported',
  
  // Lovable framework postMessage warnings
  'Failed to execute \'postMessage\' on \'DOMWindow\'',
  'The target origin provided',
  'lovable.js',
  'gptengineer.app',
  'lovable.dev',
  'beta.lovable.dev',
  'localhost:3000',
];

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

/**
 * Check if a message should be ignored
 */
function shouldIgnoreMessage(message: string): boolean {
  if (typeof message !== 'string') return false;
  
  return IGNORED_ERRORS.some(ignored => 
    message.includes(ignored)
  );
}

/**
 * Filter console.error
 */
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  
  // Only filter if it's a known browser extension/framework error
  if (shouldIgnoreMessage(message)) {
    return; // Suppress the error
  }
  
  // Log real application errors
  originalConsoleError.apply(console, args);
};

/**
 * Filter console.warn
 */
console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  
  // Only filter if it's a known browser extension/framework warning
  if (shouldIgnoreMessage(message)) {
    return; // Suppress the warning
  }
  
  // Log real application warnings
  originalConsoleWarn.apply(console, args);
};

/**
 * Filter console.log (optional - only filter migration logs)
 */
console.log = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  
  // Only filter Bitwarden migration logs
  if (message.includes('Migrator') || message.includes('State version')) {
    return; // Suppress migration logs
  }
  
  // Log everything else
  originalConsoleLog.apply(console, args);
};

export {};
