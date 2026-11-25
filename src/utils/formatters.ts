/**
 * Utilidades de formato
 */

/**
 * Formatea una fecha en formato legible
 */
export const formatDate = (date: string | Date, locale = 'es-ES'): string => {
  return new Date(date).toLocaleDateString(locale);
};

/**
 * Formatea un número como moneda
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Trunca un string a una longitud específica
 */
export const truncateString = (str: string, length: number): string => {
  return str.length > length ? `${str.substring(0, length)}...` : str;
};

/**
 * Capitaliza la primera letra de un string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function humanizeRole(role?: string): string {
  switch (role) {
    case 'ADMINISTRATOR':
    case 'ADMIN':
      return 'Administrador';
    case 'TEACHER':
    case 'DOCENTE':
      return 'Docente';
    case 'GUARDIAN':
    case 'APODERADO':
      return 'Apoderado';
    case 'STUDENT':
    case 'ESTUDIANTE':
      return 'Estudiante';
    default:
      return role ?? '';
  }
}

/** "hace 12 s", "hace 3 min", "hace 2 h" a partir de un instante ISO-8601. */
export function timeAgo(iso: string | null, now: number): string {
  if (!iso) return 'sin eventos aún';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.round(minutes / 60)} h`;
}
