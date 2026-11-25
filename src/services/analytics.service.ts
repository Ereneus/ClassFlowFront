import { apiService } from './api.service';

/**
 * Indicadores que ms-analytics calcula en streaming a partir de los eventos Kafka
 * (tópicos classflow.academic.grades y classflow.assistance.attendance).
 */
export interface AttendanceStats {
  /** Estudiante o curso. */
  id: number;
  records: number;
  present: number;
  absent: number;
  justifiedAbsences: number;
  /** Porcentaje de asistencia (0-100). */
  attendanceRate: number;
}

export interface GradeStats {
  /** Estudiante o asignatura. */
  id: number;
  grades: number;
  average: number;
  averagePercentage: number;
  min: number;
  max: number;
}

export interface AnalyticsSummary {
  gradesTracked: number;
  attendanceRecordsTracked: number;
  gradeEventsProcessed: number;
  attendanceEventsProcessed: number;
  /** Instante (ISO-8601) del último evento procesado, o null si aún no llega ninguno. */
  lastEventAt: string | null;
  attendanceThreshold: number;
  studentsAtRisk: AttendanceStats[];
}

class AnalyticsService {
  getSummary(): Promise<AnalyticsSummary> {
    return apiService.get<AnalyticsSummary>('/analytics/summary');
  }

  getAttendanceByCourse(): Promise<AttendanceStats[]> {
    return apiService.get<AttendanceStats[]>('/analytics/courses/attendance');
  }

  getStudentGrades(studentId: number): Promise<GradeStats> {
    return apiService.get<GradeStats>(`/analytics/students/${studentId}/grades`);
  }
}

export const analyticsService = new AnalyticsService();

export default analyticsService;
