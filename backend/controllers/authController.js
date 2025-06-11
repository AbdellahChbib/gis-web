import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const register = async (req, res) => {
  const { email, password, firstName, lastName, role, studentId, department, promotion, specialization } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Si c'est un étudiant, vérifier si le numéro d'étudiant existe déjà
    if (role === 'student') {
      const studentExists = await pool.query(
        'SELECT * FROM student_details WHERE student_id = $1',
        [studentId]
      );

      if (studentExists.rows.length > 0) {
        return res.status(400).json({ message: 'Ce numéro d\'étudiant est déjà utilisé' });
      }
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Commencer une transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insérer l'utilisateur
      const { rows } = await client.query(
        `INSERT INTO users (email, password, role, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, role, first_name as "firstName", last_name as "lastName"`,
        [email, hashedPassword, role, firstName, lastName]
      );

      // Ajouter les détails spécifiques selon le rôle
      if (role === 'student') {
        await client.query(
          `INSERT INTO student_details (user_id, student_id, department, promotion)
           VALUES ($1, $2, $3, $4)`,
          [rows[0].id, studentId, department, promotion]
        );
      } else if (role === 'teacher') {
        await client.query(
          `INSERT INTO teacher_details (user_id, department, specialization)
           VALUES ($1, $2, $3)`,
          [rows[0].id, department, specialization]
        );
      }

      await client.query('COMMIT');

      // Générer le token JWT
      const token = jwt.sign(
        { userId: rows[0].id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'Utilisateur créé avec succès',
        user: rows[0],
        token
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Récupérer l'utilisateur avec le mot de passe
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.password, u.role, u.first_name as "firstName", u.last_name as "lastName", 
        CASE 
          WHEN u.role = 'student' THEN json_build_object('student_id', sd.student_id, 'department', sd.department, 'promotion', sd.promotion)
          WHEN u.role = 'teacher' THEN json_build_object('department', td.department, 'specialization', td.specialization)
          ELSE '{}'::json
        END as details
       FROM users u
       LEFT JOIN student_details sd ON u.id = sd.user_id AND u.role = 'student'
       LEFT JOIN teacher_details td ON u.id = td.user_id AND u.role = 'teacher'
       WHERE u.email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Supprimer le mot de passe de la réponse
    delete rows[0].password;

    res.json({
      user: rows[0],
      token
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
};

export const deleteAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Supprimer d'abord les détails spécifiques selon le rôle
      const { rows } = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      const role = rows[0].role;
      if (role === 'student') {
        await client.query('DELETE FROM student_details WHERE user_id = $1', [userId]);
      } else if (role === 'teacher') {
        await client.query('DELETE FROM teacher_details WHERE user_id = $1', [userId]);
      }

      // Supprimer l'utilisateur
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      res.json({ message: 'Compte supprimé avec succès' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du compte' });
  }
}; 