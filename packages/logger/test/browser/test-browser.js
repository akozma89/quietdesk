// Import the Logger class
import { Logger } from '../../src/index';

// Get DOM elements
const tokenInput = document.getElementById('token');
const datasetInput = document.getElementById('dataset');
const messageInput = document.getElementById('message');
const initLoggerBtn = document.getElementById('init-logger');
const logInfoBtn = document.getElementById('log-info');
const logWarnBtn = document.getElementById('log-warn');
const logErrorBtn = document.getElementById('log-error');
const flushLogsBtn = document.getElementById('flush-logs');
const outputDiv = document.getElementById('output');
const loggingSection = document.getElementById('logging-section');

// Logger instance
let logger = null;

// Function to add log entry to the output div
function addLogEntry(message, type = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.textContent = message;
  outputDiv.appendChild(logEntry);
  
  // Auto-scroll to bottom
  outputDiv.scrollTop = outputDiv.scrollHeight;
}

// Override console.log to display in the output div
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = (...args) => {
  originalConsoleLog.apply(console, args);
  addLogEntry(args.join(' '), 'info');
};

console.warn = (...args) => {
  originalConsoleWarn.apply(console, args);
  addLogEntry(args.join(' '), 'warn');
};

console.error = (...args) => {
  originalConsoleError.apply(console, args);
  addLogEntry(args.join(' '), 'error');
};

// Initialize logger
initLoggerBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  const dataset = datasetInput.value.trim();
  
  if (!token || !dataset) {
    console.error('Please enter both Axiom token and dataset');
    return;
  }
  
  try {
    // Clear previous output
    outputDiv.innerHTML = '';
    
    console.log(`Initializing logger with token=${token.substring(0, 5)}... and dataset=${dataset}`);
    
    // Create a new logger instance with isBrowser=true
    logger = new Logger(token, dataset, true);
    
    console.log('Logger initialized successfully');
    
    // Show logging section
    loggingSection.style.display = 'block';
    
    // Enable logging buttons
    logInfoBtn.disabled = false;
    logWarnBtn.disabled = false;
    logErrorBtn.disabled = false;
    flushLogsBtn.disabled = false;
  } catch (error) {
    console.error('Error initializing logger:', error);
  }
});

// Log info message
logInfoBtn.addEventListener('click', () => {
  if (!logger) {
    console.error('Please initialize the logger first');
    return;
  }
  
  const message = messageInput.value.trim() || 'Test info message';
  console.log(`Sending info log: ${message}`);
  logger.info(message);
});

// Log warning message
logWarnBtn.addEventListener('click', () => {
  if (!logger) {
    console.error('Please initialize the logger first');
    return;
  }
  
  const message = messageInput.value.trim() || 'Test warning message';
  console.log(`Sending warning log: ${message}`);
  logger.warn(message);
});

// Log error message
logErrorBtn.addEventListener('click', () => {
  if (!logger) {
    console.error('Please initialize the logger first');
    return;
  }
  
  const message = messageInput.value.trim() || 'Test error message';
  console.log(`Sending error log: ${message}`);
  logger.error(message);
});

// Flush logs
flushLogsBtn.addEventListener('click', async () => {
  if (!logger) {
    console.error('Please initialize the logger first');
    return;
  }
  
  console.log('Flushing logs...');
  try {
    await logger.flush();
    console.log('Logs flushed successfully');
  } catch (error) {
    console.error('Error flushing logs:', error);
  }
});

// Disable logging buttons initially
logInfoBtn.disabled = true;
logWarnBtn.disabled = true;
logErrorBtn.disabled = true;
flushLogsBtn.disabled = true;

// Initial message
console.log('Logger Browser Test Ready');
console.log('Enter your Axiom token and dataset, then click "Initialize Logger"');
