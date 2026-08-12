import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME
} = process.env;

async function test() {
  console.log('--- Database Diagnostics ---');
  console.log(`Connecting to: Host=${DB_HOST || 'localhost'}, Port=${DB_PORT || 3306}, User=${DB_USER || 'root'}, DB=${DB_NAME || 'mini_erp_crm'}`);
  
  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST || 'localhost',
      port: Number(DB_PORT) || 3306,
      user: DB_USER || 'root',
      password: DB_PASSWORD || 'password',
      database: DB_NAME || 'mini_erp_crm'
    });
    console.log('✅ Connected successfully!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return;
  }

  try {
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables found in database:', tables.map(t => Object.values(t)[0]));

    const [users] = await connection.query('SELECT id, username, role, name FROM users');
    console.log(`Seeded users count: ${users.length}`);
    console.log('Seeded users list:', users);
  } catch (err) {
    console.error('❌ Query execution failed:', err.message);
  } finally {
    await connection.end();
  }
}

test();
