/**
 * Configuración global de la aplicación
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TIMEOUT = 30000; // 30 segundos
// Cada cuánto se vuelven a pedir los indicadores en vivo (alimentados por Kafka).
const ANALYTICS_REFRESH_MS = Number(import.meta.env.VITE_ANALYTICS_REFRESH_MS) || 5000;

export const config = {
  api: {
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
  },
  analytics: {
    refreshMs: ANALYTICS_REFRESH_MS,
  },
  app: {
    name: 'ClassFlow',
    version: '0.1.0',
  },
} as const;

export default config;
