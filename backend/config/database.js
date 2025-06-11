import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Connexion à PostgreSQL réussie !');
    
    // Vérifier les tables existantes
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Tables existantes :', tables.rows.map(row => row.table_name));
    
    client.release();
    return true;
  } catch (error) {
    console.error('Erreur de connexion à PostgreSQL :', error);
    return false;
  }
};

// Exporter la fonction de test avec le pool
export { pool as default, testConnection }; 