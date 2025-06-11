import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiMap, FiDatabase, FiMail, FiSearch, FiLogOut, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import ehtpLogo from '../assets/EHTP_1.png';
import '../styles/Navbar.css';
import { Link } from 'react-router-dom';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      const result = await deleteAccount();
      if (result.success) {
        navigate('/login');
      } else {
        alert(result.error);
      }
    }
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  // Obtenir l'initiale du prénom
  const getInitial = (user) => {
    return user?.firstName ? user.firstName.charAt(0).toUpperCase() : '?';
  };

  // Obtenir la couleur de fond basée sur le rôle
  const getProfileColor = (role) => {
    console.log('Current role:', role); // Pour le débogage
    switch (role?.toLowerCase()) {
      case 'admin':
        return '#FF5722';
      case 'teacher':
        return '#2196F3';
      default:
        return '#4CAF50';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <img src={ehtpLogo} alt="Logo EHTP" className="ehtp-logo" />
        </div>

        <div className="navbar-controls">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ul className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
            <li>
              <Link to="/" className="nav-link hover-effect">
                <FiHome className="nav-icon" />
                Accueil
              </Link>
            </li>
            <li>
              <Link to="/carte" className="nav-link hover-effect">
                <FiMap className="nav-icon" />
                Cartes
              </Link>
            </li>
            <li>
              <a href="#" className="nav-link hover-effect">
                <FiDatabase className="nav-icon" />
                Données
              </a>
            </li>
            <li>
              <a href="#" className="nav-link hover-effect">
                <FiMail className="nav-icon" />
                Contact
              </a>
            </li>
          </ul>

          <div className="navbar-actions">
            {user ? (
              <div className="user-profile" onClick={toggleProfileMenu}>
                <div 
                  className="profile-initial"
                  style={{ backgroundColor: getProfileColor(user.role) }}
                >
                  {getInitial(user)}
                </div>
                <div className={`profile-menu ${isProfileMenuOpen ? 'active' : ''}`}>
                  <div className="user-info">
                    <span className="user-name">{user.firstName} {user.lastName}</span>
                    <span className="user-email">{user.email}</span>
                    <span className="user-role">
                      {user.role === 'admin' ? 'Administrateur' :
                       user.role === 'teacher' ? 'Enseignant' : 'Élève'}
                    </span>
                  </div>
                  <button onClick={handleLogout} className="logout-btn">
                    <FiLogOut className="logout-icon" />
                    Déconnexion
                  </button>
                  <button onClick={handleDeleteAccount} className="delete-account-btn">
                    <FiTrash2 className="delete-icon" />
                    Supprimer mon compte
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button 
                  className="login-btn"
                  onClick={() => navigate('/login')}
                >
                  Connexion
                </button>
                <button 
                  className="signup-btn"
                  onClick={() => navigate('/register')}
                >
                  Inscription
                </button>
              </div>
            )}
          </div>
        </div>

        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;