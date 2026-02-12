import { initializeDatabase } from '../config/database';
import logger from '../config/logger';

// SQLite migration is now handled automatically by initializeDatabase()
// This script is kept for compatibility but delegates to the auto-initialization
const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Running SQLite database initialization...');
    
    // Initialize SQLite database with all required tables
    await initializeDatabase();
    
    logger.info('✅ SQLite database migration completed successfully');
  } catch (error) {
    logger.error('❌ Database migration failed:', error);
    throw error;
  }
};

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default runMigrations;