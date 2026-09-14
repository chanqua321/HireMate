import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface IUseScrollTopReturn {
  // Returns void, nothing explicitly exposed yet
}

export const useScrollTop = (): void => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [pathname]);
};
