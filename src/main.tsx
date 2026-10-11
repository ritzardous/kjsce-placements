import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './migration.css';
import './portal.css';
import './procedures.css';
import './mobile.css';
import './enhancements.css';
import './app-polish.css';
import './neobrutal.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
