import 'dotenv/config';
import { db } from './index.js';
import { usersTable } from './schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('ep-cool-name')) {
    console.log('⚠️ Please update DATABASE_URL in your .env file with your real Neon Postgres connection string!');
    return;
  }

  try {
    const user = {
      name: 'John Doe',
      age: 30,
      email: `john-${Date.now()}@example.com`,
    };

    console.log('🚀 Creating user...');
    await db.insert(usersTable).values(user);
    console.log('✅ New user created!');

    const users = await db.select().from(usersTable);
    console.log('📋 All users in database:', users);

    console.log('🔄 Updating user age...');
    await db.update(usersTable).set({ age: 31 }).where(eq(usersTable.email, user.email));
    console.log('✅ User updated!');

    console.log('🗑️ Cleaning up test user...');
    await db.delete(usersTable).where(eq(usersTable.email, user.email));
    console.log('✅ User deleted!');

    console.log('🎉 Database test completed successfully!');
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

main();
