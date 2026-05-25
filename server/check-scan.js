require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SR_KEY = process.env.SUPABASE_KEY;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZWFlbnB6Y215ZG9yaHNqcXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjM0MTcsImV4cCI6MjA5NDgzOTQxN30.r2sLp5nbpYzQRkeO6DmqlbcFGYOQ81UekxOm9S18O-g';

const sr = createClient(SUPABASE_URL, SR_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  // 1. 拿真实 UUID
  const g = await sr.from('store_games').select('id, store_id').limit(1);
  const gameId = g.data[0].id;
  const storeId = g.data[0].store_id;
  console.log('game id:', gameId);

  // 2. anon INSERT
  console.log('\n--- anon INSERT ---');
  const i1 = await anon.from('scan_logs').insert([{
    game_id: gameId, shop_id: storeId, scanned_at: new Date().toISOString()
  }]);
  console.log('error:', i1.error ? (i1.error.code + ': ' + i1.error.message) : 'none');

  // 3. service_role INSERT
  console.log('\n--- service_role INSERT ---');
  const i2 = await sr.from('scan_logs').insert([{
    game_id: gameId, shop_id: storeId, scanned_at: new Date().toISOString()
  }]);
  console.log('error:', i2.error ? (i2.error.code + ': ' + i2.error.message) : 'none');

  // 4. anon SELECT
  console.log('\n--- anon SELECT ---');
  const s = await anon.from('scan_logs').select('*', { count: 'exact', head: true });
  console.log('error:', s.error ? (s.error.code + ': ' + s.error.message) : 'none');
  console.log('count:', s.count);

  // 5. anon DELETE
  console.log('\n--- anon DELETE ---');
  const d = await anon.from('scan_logs').delete().eq('game_id', gameId);
  console.log('error:', d.error ? (d.error.code + ': ' + d.error.message) : 'none');

  // 6. service_role 清理
  const d2 = await sr.from('scan_logs').delete().eq('game_id', gameId);
  console.log('\n--- final cleanup --- error:', d2.error ? d2.error.message : 'none');
}
main();