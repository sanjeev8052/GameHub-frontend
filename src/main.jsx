import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;
window.global = window;

// Some versions of simple-peer/readable-stream need nextTick
if (typeof process.nextTick !== 'function') {
  process.nextTick = (fn, ...args) => setTimeout(() => fn(...args), 0);
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
