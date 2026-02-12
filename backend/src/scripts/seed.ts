import { initializeDatabase } from '../config/database';
import logger from '../config/logger';

// SQLite seeding is now handled automatically by initializeDatabase()
// This script is kept for compatibility but delegates to the auto-initialization
async function seedDatabase(): Promise<void> {
  try {
    logger.info('Running SQLite database seeding...');
    
    // Initialize SQLite database with default admin users
    await initializeDatabase();
    
    logger.info('✅ SQLite database seeding completed successfully');
    logger.info('Default users created:');
    logger.info('  - admin/admin123 (super_admin)');
    logger.info('  - guard/guard123 (guard)');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding script failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;