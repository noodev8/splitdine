// Quick diagnostic script to check user events in the database
// Run with: node check-user-events.js <user_email>

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'splitdine',
  user: process.env.DB_USER || 'splitdine_user',
  password: process.env.DB_PASSWORD || 'your_secure_password',
});

async function checkUserEvents(email) {
  try {
    // Get user
    const userResult = await pool.query(
      'SELECT id, name, email FROM app_users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ No user found with email: ${email}`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`\n✓ Found user:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);

    // Get events using the same query as get_my_events endpoint
    const eventsResult = await pool.query(
      `SELECT e.id, e.name, e.guest_code, e.created_at,
              CASE
                WHEN e.user_id = $1 THEN 'host'
                WHEN g.co_host = true THEN 'host'
                ELSE 'guest'
              END as role,
              g.id as guest_id,
              g.name as guest_name,
              g.app_user_id,
              COALESCE(g.created_at, e.created_at) as joined_at
       FROM events e
       LEFT JOIN guests g ON e.id = g.event_id AND g.app_user_id = $1
       WHERE e.user_id = $1 OR g.app_user_id = $1
       ORDER BY COALESCE(g.created_at, e.created_at) DESC`,
      [user.id]
    );

    console.log(`\n✓ Found ${eventsResult.rows.length} event(s):\n`);

    eventsResult.rows.forEach((event, index) => {
      console.log(`${index + 1}. ${event.name}`);
      console.log(`   Event ID: ${event.id}`);
      console.log(`   Guest Code: ${event.guest_code}`);
      console.log(`   Role: ${event.role}`);
      console.log(`   Guest ID: ${event.guest_id || 'N/A'}`);
      console.log(`   Guest Name: ${event.guest_name || '(empty)'}`);
      console.log(`   Joined: ${event.joined_at}`);
      console.log('');
    });

    // Also check for any guest profiles not returned by the query
    const allGuestsResult = await pool.query(
      `SELECT g.id, g.name, g.event_id, g.app_user_id, e.name as event_name
       FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.app_user_id = $1`,
      [user.id]
    );

    if (allGuestsResult.rows.length !== eventsResult.rows.length) {
      console.log(`⚠️  Warning: Found ${allGuestsResult.rows.length} guest profiles but only ${eventsResult.rows.length} events returned`);
      console.log('   All guest profiles:');
      allGuestsResult.rows.forEach(guest => {
        console.log(`   - Event: ${guest.event_name} (ID: ${guest.event_id}), Guest ID: ${guest.id}, Name: ${guest.name || '(empty)'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node check-user-events.js <user_email>');
  process.exit(1);
}

checkUserEvents(email);
