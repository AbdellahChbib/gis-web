import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiArrowLeft, FiUserCheck, FiAlertCircle, FiBook, FiHash } from 'react-icons/fi';
import '../styles/AuthPages.css';
import ehtpLogo from '../assets/EHTP_1.png';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    promotion: '',
    specialization: '',
    studentId: ''
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (formData.role === 'student' && !formData.studentId) {
      setError('Veuillez entrer votre numéro d\'étudiant');
      return;
    }

    if (!formData.department) {
      setError('Veuillez sélectionner votre département');
      return;
    }

    const result = await register(formData);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <FiArrowLeft /> Retour
          </button>
          <img src={ehtpLogo} alt="EHTP Logo" className="auth-logo" />
        </div>

        <div className="auth-form-container">
          <div className="auth-welcome">
            <h1>Créer un compte</h1>
            <p>Rejoignez notre communauté</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-message">
                <FiAlertCircle />
                {error}
              </div>
            )}
            <div className="form-group">
              <div className="input-icon-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Votre nom complet"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-icon-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Votre email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-icon-wrapper">
                <FiUserCheck className="input-icon" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="role-select"
                >
                  <option value="student">Élève</option>
                  <option value="teacher">Enseignant</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <div className="input-icon-wrapper">
                <FiBook className="input-icon" />
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="department-select"
                >
                  <option value="">Sélectionnez votre département</option>
                  <option value="SIG">Sciences d'information géographique</option>
                  <option value="GI">Génie Informatique</option>
                  <option value="GC">Génie Civil</option>
                  <option value="GE">Génie Électrique</option>
                  <option value="IHE">Génie Hydraulique, Environnement et Ville</option>
                  <option value="Météo">Météorologie</option>
                  <option value="GLT">Génie Logistique et Transports</option>
                </select>
              </div>
            </div>

            {formData.role === 'student' && (
              <>
                <div className="form-group">
                  <div className="input-icon-wrapper">
                    <FiHash className="input-icon" />
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      placeholder="Numéro d'étudiant"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="input-icon-wrapper">
                    <FiBook className="input-icon" />
                    <select
                      name="promotion"
                      value={formData.promotion}
                      onChange={handleChange}
                      required
                      className="promotion-select"
                    >
                      <option value="">Sélectionnez votre promotion</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* {formData.role === 'teacher' && (
              <div className="form-group">
                <div className="input-icon-wrapper">
                  <FiBook className="input-icon" />
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="Spécialisation"
                    required
                  />
                </div>
              </div>
            )} */}

            <div className="form-group">
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmez votre mot de passe"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn">
              S'inscrire
            </button>
          </form>

          <div className="auth-links">
            <p className="login-link">
              Déjà un compte ?{' '}
              <button onClick={() => navigate('/login')} className="link-button">
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-background">
        <div className="auth-background-overlay"></div>
      </div>
    </div>
  );
};

export default RegisterPage; 