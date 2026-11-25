import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnalyticsSummary, AttendanceStats, DashboardCourse, User } from '@services';
import { timeAgo } from '@utils';
import { AdminStreamingView } from '../AdminStreamingView';

const analytics = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getAttendanceByCourse: vi.fn(),
}));

vi.mock('@services', () => ({ analyticsService: analytics }));

const summary = (overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary => ({
  gradesTracked: 4,
  attendanceRecordsTracked: 10,
  gradeEventsProcessed: 5,
  attendanceEventsProcessed: 10,
  lastEventAt: new Date().toISOString(),
  attendanceThreshold: 85,
  studentsAtRisk: [{ id: 7, records: 4, present: 2, absent: 2, justifiedAbsences: 1, attendanceRate: 50 }],
  ...overrides,
});

const courseStats: AttendanceStats[] = [
  { id: 1, records: 10, present: 9, absent: 1, justifiedAbsences: 0, attendanceRate: 90 },
];

const users: User[] = [
  { id: '7', nombre: 'Ana Pérez', email: 'ana@example.com', rol: 'STUDENT', activo: true, createdAt: '2026-03-01' },
];
const courses = [{ id: 1, name: '1° Medio A' }] as DashboardCourse[];

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('AdminStreamingView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    analytics.getAttendanceByCourse.mockResolvedValue(courseStats);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('muestra los indicadores con nombres de cursos y estudiantes', async () => {
    analytics.getSummary.mockResolvedValue(summary());

    render(<AdminStreamingView users={users} courses={courses} />);
    await flush();

    expect(screen.getByText('Eventos de notas procesados')).toBeInTheDocument();
    expect(screen.getByText('1° Medio A')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText(/En vivo · se actualiza cada 5 s/)).toBeInTheDocument();
  });

  it('se actualiza sola cuando llega un evento nuevo', async () => {
    analytics.getSummary
      .mockResolvedValueOnce(summary({ gradeEventsProcessed: 5 }))
      .mockResolvedValue(summary({ gradeEventsProcessed: 6 }));

    render(<AdminStreamingView users={users} courses={courses} />);
    await flush();
    expect(screen.getByText('5')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await flush();

    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('informa el error si ms-analytics no responde', async () => {
    analytics.getSummary.mockRejectedValue({ message: 'Network Error' });

    render(<AdminStreamingView users={users} courses={courses} />);
    await flush();

    expect(screen.getByText(/No se pudo cargar la analítica en vivo: Network Error/)).toBeInTheDocument();
  });
});

describe('timeAgo', () => {
  it('formatea segundos, minutos y horas', () => {
    const now = Date.parse('2026-11-25T12:00:00Z');
    expect(timeAgo(null, now)).toBe('sin eventos aún');
    expect(timeAgo('2026-11-25T11:59:48Z', now)).toBe('hace 12 s');
    expect(timeAgo('2026-11-25T11:57:00Z', now)).toBe('hace 3 min');
    expect(timeAgo('2026-11-25T10:00:00Z', now)).toBe('hace 2 h');
  });
});
