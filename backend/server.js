import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import { testConnection } from './config/database.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test de connexion à la base de données au démarrage
testConnection().then(success => {
  if (!success) {
    console.error('Erreur : Impossible de se connecter à la base de données. Vérifiez vos paramètres PostgreSQL.');
    process.exit(1);
  }
});

// Routes
app.use('/api/auth', authRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API GIS Web Project' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 