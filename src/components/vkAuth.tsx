import React, { useState, useEffect } from 'react';

interface VKAuthResponse {
  access_token: string;
  user_id: number;
  email?: string;
  expires_in: number;
}

const VKAuth: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<VKAuthResponse | null>(null);

  // ID вашего приложения VK
  const APP_ID = 'YOUR_APP_ID';
  const REDIRECT_URI = `${window.location.origin}/vk-auth`;
  const SCOPE = 'email'; // Запрашиваемые права

  const openVKAuth = () => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const authUrl = `https://oauth.vk.com/authorize?` +
      `client_id=${APP_ID}` +
      `&display=popup` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${SCOPE}` +
      `&response_type=token` +
      `&v=5.131`;

    window.open(
      authUrl,
      'VK Auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  // Обработка callback от VK
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Проверяем источник сообщения для безопасности
      if (event.origin !== 'https://oauth.vk.com') return;

      if (event.data.type === 'VK_AUTH_SUCCESS') {
        const authData: VKAuthResponse = event.data.data;
        
        setUserData(authData);
        setIsAuthenticated(true);
        
        // Сохраняем в localStorage
        localStorage.setItem('vk_access_token', authData.access_token);
        localStorage.setItem('vk_user_id', authData.user_id.toString());
        
        // Закрываем popup окно
        if (event.source && 'close' in event.source) {
          (event.source as Window).close();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Проверяем hash параметры (альтернативный способ)
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && window.opener) {
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const userId = params.get('user_id');

      if (accessToken && userId) {
        const authData: VKAuthResponse = {
          access_token: accessToken,
          user_id: parseInt(userId),
          expires_in: 86400
        };

        // Отправляем данные в родительское окно
        window.opener.postMessage({
          type: 'VK_AUTH_SUCCESS',
          data: authData
        }, window.location.origin);
      }
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserData(null);
    localStorage.removeItem('vk_access_token');
    localStorage.removeItem('vk_user_id');
  };

  return (
    <div className="vk-auth-container">
      {!isAuthenticated ? (
        <button 
          className="vk-auth-button"
          onClick={openVKAuth}
        >
          <div className="vk-button-content">
            <svg className="vk-icon" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#fff" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm6 16.3c-.3.3-.6.4-1 .4-.3 0-.6-.1-.8-.3-.5-.3-1-.7-1.5-1-.2-.2-.4-.3-.7-.3-.3 0-.6.1-.8.3l-.6.6c-.5.5-1.3.5-1.8 0-1.1-1-2-2.2-2.7-3.5-.2-.4 0-.8.4-1 .1-.1.3-.1.4-.1.3 0 .6.2.7.4.6 1.1 1.4 2.1 2.3 3 .2.2.5.2.7 0 .3-.3.6-.6.9-.9.8-.8 1.7-1.5 2.7-2 .3-.2.7-.1.9.2.2.3.1.7-.2.9-.8.5-1.5 1.1-2.1 1.8-.3.3-.5.6-.8.8 0 0 0 0 0 0 .3.3.6.5 1 .7.5.3 1 .3 1.4 0 .3-.2.5-.5.5-.9v-1.7c0-.4.3-.7.7-.7h1.7c.4 0 .7.3.7.7v2.6c0 .5-.2.9-.6 1.2z"/>
            </svg>
            Войти через VK
          </div>
        </button>
      ) : (
        <div className="user-info">
          <h3>Успешная авторизация!</h3>
          <p>User ID: {userData?.user_id}</p>
          <p>Email: {userData?.email || 'Не указан'}</p>
          <button onClick={handleLogout} className="logout-button">
            Выйти
          </button>
        </div>
      )}
    </div>
  );
};

export default VKAuth;