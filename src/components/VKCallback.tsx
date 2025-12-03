// components/VKCallback.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const VKCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      try {
        // Получаем параметры из URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const device_id = urlParams.get('device_id');
        const state = urlParams.get('state') || '';
        
        console.log('Callback received params:', { code, device_id, state });

        if (code && device_id) {
          // Отправляем сообщение родительскому окну (если есть)
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'VK_AUTH_SUCCESS',
              code: code,
              device_id: device_id,
              state: state
            }, window.location.origin);
            
            console.log('Message sent to opener from:', window.location.origin);
            
            // Закрываем окно через короткую задержку
            setTimeout(() => {
              window.close();
            }, 300);
          } else {
            // Если нет родительского окна, сохраняем в sessionStorage
            // и редиректим обратно
            sessionStorage.setItem('vk_auth_code', code);
            sessionStorage.setItem('vk_auth_device_id', device_id);
            sessionStorage.setItem('vk_auth_state', state);
            
            // Редирект на основную страницу
            navigate('/');
          }
        } else {
          console.warn('Missing code or device_id parameters');
          navigate('/');
        }
      } catch (error) {
        console.error('Error in callback handling:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="callback-container">
      <div className="spinner"></div>
      <h1>Обработка авторизации...</h1>
      <p>Пожалуйста, подождите</p>
    </div>
  );
};

export default VKCallback;