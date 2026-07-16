const test = require('node:test');
const assert = require('node:assert/strict');
const { generateAlertSummary } = require('./dashboard-utils');

test('generateAlertSummary returns critical, offline and priority alerts', () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 10_000).toISOString();
  const containers = {
    c1: { id: 'c1', name: 'Contenedor 1', current_fill_level: 85, last_updated: recent },
    c2: { id: 'c2', name: 'Contenedor 2', current_fill_level: 30, last_updated: null },
    c3: { id: 'c3', name: 'Contenedor 3', current_fill_level: 60, last_updated: recent }
  };

  const summary = generateAlertSummary(containers);
  assert.equal(summary.criticalCount, 1);
  assert.equal(summary.offlineCount, 1);
  assert.equal(summary.warningCount, 1);
  assert.equal(summary.priorityCount, 3);
  assert.equal(summary.alerts[0].severity, 'critical');
  assert.equal(summary.alerts[1].severity, 'warning');
});
