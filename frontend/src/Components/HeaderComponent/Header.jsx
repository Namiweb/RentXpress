import React from 'react';

const Header = () => {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '4rem 0',
      textAlign: 'center',
      marginBottom: '2rem'
    }}>
      <div className="container">
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Vehicle Management System
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
          Efficiently manage your vehicle fleet with our comprehensive solution
        </p>
      </div>
    </header>
  );
};

export default Header;