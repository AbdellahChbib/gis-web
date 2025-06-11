import { testConnection } from './config/database.js';

console.log('Test de connexion à la base de données PostgreSQL...');

testConnection()
  .then(success => {
    if (success) {
      console.log('✅ Connexion réussie !');
      process.exit(0);
    } else {
      console.error('❌ Échec de la connexion');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Erreur lors du test :', error);
    process.exit(1);
  }); 