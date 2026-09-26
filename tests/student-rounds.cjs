const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const fields = {
  'round-course-input': { value: 'Campo de prueba' },
  'round-date-input': { value: '2026-09-25' },
  'round-save-btn': { disabled: false },
  'round-kind-select': { value: 'Práctica' }
};
let calls = [], localWrites = 0, fail = false;
const context = {
  console: { error() {} }, navigator: { onLine: true },
  document: { getElementById: id => fields[id] },
  GolfForm: { validate: () => true, setStatus() {}, setBusy(b, value) { b.disabled = value; } },
  GolfUtils: { localDateISO: () => '2026-09-25' },
  StorageManager: { workspaceOwnerId: null, makeId: () => 'local-id', async addRound() { localWrites++; } },
  AuthEngine: { user: { id: 'student-a' }, isCoach: () => false, client: { async rpc(name, payload) {
    calls.push({ name, payload }); return { error: fail ? new Error('network') : null };
  } } },
  PlayerPortal: { active: true, isPlayerAccount: () => true, data: { player: { id: 'player-a' } }, async load() {} },
  App: { closeModal() {}, showToast() {}, showSaveConfirmation() {} }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/rounds.js', 'utf8'), context);
const engine = context.RoundsEngine;
engine.selectHole = () => {};
function setup() {
  fields['round-save-btn'].disabled = false;
  engine.roundPlayerContext = { student: true, playerId: 'player-a', accountUserId: 'student-a', workspaceOwnerId: null, submissionId: 'stable-id' };
  engine.holeData = Array.from({ length: 9 }, (_, i) => ({ hole: i + 1, par: 4, strokes: 5, putts: 2, penalty: 0, fir: null, gir: false, completed: true }));
}
(async () => {
  setup();
  await engine.saveNewRound();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.p_round.totalScore, 45);
  assert.equal(calls[0].payload.p_round.holes.length, 9);
  assert.equal(localWrites, 0, 'Student must not write into coach storage');
  setup(); calls = [];
  engine.holeData[0].completed = false;
  await engine.saveNewRound();
  assert.equal(calls.length, 0, 'Incomplete scorecard must not submit');
  setup(); context.AuthEngine.user.id = 'other-user';
  await engine.saveNewRound();
  assert.equal(calls.length, 0, 'Account switch must prevent submission');
  context.AuthEngine.user.id = 'student-a'; setup(); fail = true;
  await engine.saveNewRound();
  assert.equal(engine.holeData.length, 9, 'Failure preserves scorecard');
  assert.equal(fields['round-save-btn'].disabled, false);
  fail = false; await engine.saveNewRound();
  assert.equal(calls[0].payload.p_submission_id, calls[1].payload.p_submission_id, 'Retry keeps idempotency key');
  console.log('Student rounds: save, isolation, validation, and retry checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
