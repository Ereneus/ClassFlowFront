import React, { useCallback, useEffect, useState } from 'react';
import { config } from '@config';
import { usePolling } from '@hooks';
import { AnalyticsSummary, AttendanceStats, DashboardCourse, User, analyticsService } from '@services';
import { timeAgo } from '@utils';

interface StreamingData {
  summary: AnalyticsSummary;
  courses: AttendanceStats[];
}

const fetchStreamingData = async (): Promise<StreamingData> => {
  const [summary, courses] = await Promise.all([
    analyticsService.getSummary(),
    analyticsService.getAttendanceByCourse(),
  ]);
  return { summary, courses };
};

function fillClass(rate: number, threshold: number): string {
  if (rate >= threshold) return 'fill--good';
  return rate >= threshold - 10 ? 'fill--warn' : 'fill--bad';
}

/** Reloj de 1 s para que "hace X s" avance entre refrescos. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * Indicadores en vivo de ms-analytics. ms-analytics los recalcula al consumir cada evento
 * de Kafka (notas y asistencia); esta vista los vuelve a pedir cada
 * `config.analytics.refreshMs`, así que un registro nuevo se ve en segundos sin recargar.
 */
export const AdminStreamingView: React.FC<{ users: User[]; courses: DashboardCourse[] }> = ({ users, courses }) => {
  const fetcher = useCallback(fetchStreamingData, []);
  const { data, loading, error, lastUpdated, refresh } = usePolling(fetcher, config.analytics.refreshMs);
  const now = useNow();

  if (loading) return <p className="admin-table-muted">Conectando con la analítica en vivo...</p>;
  if (!data) {
    return (
      <p className="school-notice school-notice--error">
        No se pudo cargar la analítica en vivo: {error}{' '}
        <button type="button" className="admin-btn admin-btn--secondary" onClick={refresh}>
          Reintentar
        </button>
      </p>
    );
  }

  const { summary } = data;
  const studentName = new Map(users.map((u) => [u.id, u.nombre]));
  const courseName = new Map(courses.map((c) => [c.id, c.name]));
  const refreshSeconds = Math.round(config.analytics.refreshMs / 1000);

  const stats = [
    { label: 'Eventos de notas procesados', value: summary.gradeEventsProcessed },
    { label: 'Eventos de asistencia procesados', value: summary.attendanceEventsProcessed },
    { label: 'Notas vigentes', value: summary.gradesTracked },
    { label: 'Registros de asistencia', value: summary.attendanceRecordsTracked },
  ];

  return (
    <>
      <div className="streaming-status" role="status" aria-live="polite">
        <span className={`streaming-dot${error ? ' streaming-dot--error' : ''}`} aria-hidden="true" />
        {error ? (
          <span>Sin conexión con ms-analytics ({error}); se muestran los últimos datos.</span>
        ) : (
          <span>
            En vivo · se actualiza cada {refreshSeconds} s
            {lastUpdated && ` · última consulta ${lastUpdated.toLocaleTimeString('es-CL')}`}
          </span>
        )}
        <span className="streaming-last-event">Último evento Kafka: {timeAgo(summary.lastEventAt, now)}</span>
      </div>

      <section className="admin-stats">
        {stats.map((s) => (
          <div key={s.label} className="admin-stat-card">
            <p className="admin-stat-value">{s.value}</p>
            <p className="admin-stat-label">{s.label}</p>
          </div>
        ))}
      </section>

      <div className="admin-mid-row">
        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Asistencia por curso</h2>
          </div>
          <div className="admin-attendance-list">
            {data.courses.length > 0 ? (
              data.courses.map((c) => (
                <div key={c.id} className="admin-attendance-row">
                  <span className="admin-attendance-name">{courseName.get(c.id) ?? `Curso ${c.id}`}</span>
                  <div className="admin-progress-bar">
                    <div
                      className={`admin-progress-fill ${fillClass(c.attendanceRate, summary.attendanceThreshold)}`}
                      style={{ width: `${Math.max(0, Math.min(100, c.attendanceRate))}%` }}
                    />
                  </div>
                  <span className="admin-attendance-pct">{Math.round(c.attendanceRate)}%</span>
                </div>
              ))
            ) : (
              <p className="admin-table-muted">Aún no llegan eventos de asistencia.</p>
            )}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Asistencia bajo {summary.attendanceThreshold}%</h2>
          </div>
          {summary.studentsAtRisk.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Asistencia</th>
                  <th>Ausencias</th>
                  <th>Justificadas</th>
                </tr>
              </thead>
              <tbody>
                {summary.studentsAtRisk.map((s) => (
                  <tr key={s.id}>
                    <td>{studentName.get(String(s.id)) ?? `Estudiante ${s.id}`}</td>
                    <td>{Math.round(s.attendanceRate)}%</td>
                    <td className="admin-table-muted">{s.absent}</td>
                    <td className="admin-table-muted">{s.justifiedAbsences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-table-muted">Ningún estudiante bajo el umbral.</p>
          )}
        </section>
      </div>
    </>
  );
};
