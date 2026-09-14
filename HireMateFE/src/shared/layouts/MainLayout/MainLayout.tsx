import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header, Footer } from '../../components';
import { useScrollTop } from '../../hooks';
import './css/MainLayout.css';

export const MainLayout: React.FC = () => {
  useScrollTop();

  return (
    <div className="main-layout">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

