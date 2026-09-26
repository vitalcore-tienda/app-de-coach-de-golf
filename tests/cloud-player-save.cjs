const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
async function scenario(mode) {
  let row = mode === 'existing' ? { id: 'remote' } : null;
  let inserts = 0, updates = 0, saved = 0;
  const ctx = { console, STORAGE_KEYS: {}, window: { addEventListener() {} },
    GOLF_DATABASE: { STORES: { PLAYERS: 'players' } },
    GolfDatabase: { async put() { saved++; } },
    AuthEngine: { client: { from(table) {
      assert.equal(table, 'players');
      const q = {
        select() { return q; }, eq() { return q; },
        async maybeSingle() { return { data: row, error: null }; },
        async insert() {
          inserts++;
          if (mode === 'denied') return { error: { code: '42501' } };
          row = mode === 'invisible' ? null : { id: 'remote' };
          return { error: mode === 'race' ? { code: '23505' } : null };
        },
        update() { updates++; return q; },
        async single() { return { data: row, error: null }; }
      };
      return q;
    } } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('js/cloud-sync.js', 'utf8'), ctx);
  const call = ctx.window.CloudSync.upsertPlayer({ id: 'local', name: 'Test' }, 'coach');
  if (['denied', 'invisible'].includes(mode)) {
    await assert.rejects(call, e => e.code === '42501');
    assert.equal(saved, 0);
  } else {
    assert.equal(await call, 'remote');
    assert.equal(saved, 1);
    assert.equal(inserts, mode === 'existing' ? 0 : 1);
    assert.equal(updates, ['existing', 'race'].includes(mode) ? 1 : 0);
  }
}
(async () => {
  for (const mode of ['new', 'existing', 'race', 'denied', 'invisible']) await scenario(mode);
  console.log('Cloud player save: creation, updates, concurrent retry and permission failures passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
