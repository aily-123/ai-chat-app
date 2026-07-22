import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// 初始化后端 API 适配层，挂载为 window.electronAPI 供 store 使用
import { backendApi } from './api/backendApi';

if (typeof window !== 'undefined') {
  (window as any).electronAPI = backendApi;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
