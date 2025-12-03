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
          // Проверяем, есть ли параметры авторизации
          // Если есть - значит это callback от VK
          
          // Отправляем сообщение родительскому окну (если есть)
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'VK_AUTH_SUCCESS',
              code: code,
              device_id: device_id,
              state: state
            }, window.location.origin);
            
            console.log('Message sent to opener');
            
            // Закрываем окно через короткую задержку
            setTimeout(() => {
              window.close();
            }, 300);
          } else {
            // Если нет родительского окна, сохраняем в localStorage/sessionStorage
            // и редиректим на страницу авторизации
            localStorage.setItem('vk_callback_code', code);
            localStorage.setItem('vk_callback_device_id', device_id);
            localStorage.setItem('vk_callback_state', state);
            localStorage.setItem('vk_callback_timestamp', Date.now().toString());
            
            // Редирект на страницу авторизации
            navigate('/auth');
          }
        } else {
          // Если нет параметров авторизации - это первое открытие страницы
          // Редиректим на страницу авторизации
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in callback handling:', error);
        navigate('/auth');
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