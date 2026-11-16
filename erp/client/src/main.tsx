import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ConfirmProvider } from './components/confirm';
import App from './App';
import './index.css';

// The shared demo is embedded in a page whose URL it cannot change, so it routes in memory.
const Router = import.meta.env.VITE_DEMO ? MemoryRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>,
);
