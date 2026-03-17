const { app, pool, initializeDatabase } = require('./app');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const connection = await pool.getConnection();
    console.log('✓ Database connected successfully');
    connection.release();

    // Initialize database tables
    await initializeDatabase();
    console.log('✓ Database tables initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();