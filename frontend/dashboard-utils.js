function isOffline(lastUpdated) {
  if (!lastUpdated) return true;
  return (Date.now() - new Date(lastUpdated + (lastUpdated.endsWith('Z') ? '' : 'Z')).getTime()) > 35000;
}

function getSeverity(level, lastUpdated) {
  if (isOffline(lastUpdated)) return 'offline';
  if (level >= 80) return 'critical';
  if (level >= 60) return 'warning';
  return 'normal';
}

function generateAlertSummary(containers) {
  const list = Object.values(containers || {});
  const alerts = list
    .map(container => {
      const severity = getSeverity(container.current_fill_level || 0, container.last_updated);
      if (severity === 'normal') return null;
      return {
        id: container.id,
        name: container.name || container.id,
        severity,
        level: container.current_fill_level || 0,
        lastUpdated: container.last_updated || null,
        message: severity === 'critical'
          ? 'Nivel de llenado crítico'
          : severity === 'offline'
            ? 'Sin señal reciente'
            : 'Requiere revisión'
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, offline: 2 };
      return rank[a.severity] - rank[b.severity];
    });

  return {
    alerts,
    criticalCount: alerts.filter(item => item.severity === 'critical').length,
    offlineCount: alerts.filter(item => item.severity === 'offline').length,
    warningCount: alerts.filter(item => item.severity === 'warning').length,
    priorityCount: alerts.length,
    summary: alerts.length ? `${alerts.length} alertas activas` : 'Sin alertas activas'
  };
}

if (typeof module !== 'undefined') {
  module.exports = { generateAlertSummary, getSeverity, isOffline };
}

if (typeof window !== 'undefined') {
  window.dashboardUtils = { generateAlertSummary, getSeverity, isOffline };
}
