import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Добавляем интерфейс для сообщений
interface VKAuthMessage {
  type: 'VK_AUTH_SUCCESS';
  code: string;
  device_id: string;
  state?: string;
}

// Хук для PKCE оставляем без изменений
const usePKCE = () => {
  const [codeVerifier, setCodeVerifier] = useState<string>('');
  const [codeChallenge, setCodeChallenge] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const base64 = btoa(Array.from(array, (byte) => String.fromCharCode(byte)).join(''));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
  
    const hashArray = new Uint8Array(hash);
    const base64 = btoa(Array.from(hashArray, (byte) => String.fromCharCode(byte)).join(''));
  
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  useEffect(() => {
    const generatePKCE = async () => {
      setIsLoading(true);
      try {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);

        setCodeVerifier(verifier);
        setCodeChallenge(challenge);

        localStorage.setItem('vk_code_verifier', verifier);
      } catch (error) {
        console.error('Error generating PKCE:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generatePKCE();
  }, []);

  return { codeVerifier, codeChallenge, isLoading };
};

const VKAuth: React.FC = () => {
  const [authParams, setAuthParams] = useState<{ code: string | null; device_id: string | null }>({
    code: null,
    device_id: null
  });
  const [tokenData, setTokenData] = useState<any>(null);
  const [finalData, setFinalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isTokenReceived, setIsTokenReceived] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  const navigate = useNavigate();
  
  const { codeChallenge, codeVerifier, isLoading: pkceLoading } = usePKCE();
  
  // Redirect URI - корневой путь нашего приложения
  const redirectUri = window.location.origin;
  const currentOrigin = window.location.origin;

  // Слушаем сообщения от окна авторизации
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received from:', event.origin, 'Data:', event.data);
      
      // Проверяем origin для безопасности
      if (event.origin !== currentOrigin) {
        console.warn('Ignoring message from unknown origin:', event.origin);
        return;
      }

      const data = event.data as VKAuthMessage;
      
      if (data.type === 'VK_AUTH_SUCCESS') {
        console.log('Received auth params from popup:', data);
        
        // Закрываем всплывающее окно
        if (authWindow) {
          authWindow.close();
          setAuthWindow(null);
        }
        
        // Сохраняем параметры
        setAuthParams({
          code: data.code,
          device_id: data.device_id
        });
        
        // Обменяем code на token
        if (data.code && data.device_id) {
          exchangeCodeForToken(data.code, data.device_id);
        }
        
        setIsAuthInProgress(false);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [authWindow, currentOrigin]);

  // Проверяем закрытие окна пользователем
  useEffect(() => {
    if (!authWindow) return;

    const checkWindowClosed = setInterval(() => {
      if (authWindow.closed) {
        console.log('Auth window was closed by user');
        setAuthWindow(null);
        setIsAuthInProgress(false);
        clearInterval(checkWindowClosed);
      }
    }, 500);

    return () => {
      clearInterval(checkWindowClosed);
    };
  }, [authWindow]);

  // Проверяем localStorage на наличие callback параметров
  // (если callback сработал в том же окне/вкладке)
  useEffect(() => {
    const checkForCallbackParams = () => {
      const storedCode = localStorage.getItem('vk_callback_code');
      const storedDeviceId = localStorage.getItem('vk_callback_device_id');
      const storedTimestamp = localStorage.getItem('vk_callback_timestamp');
      
      if (storedCode && storedDeviceId && storedTimestamp) {
        const timestamp = parseInt(storedTimestamp, 10);
        const now = Date.now();
        
        // Проверяем, что данные не старше 5 минут
        if (now - timestamp < 5 * 60 * 1000) {
          console.log('Found recent callback params in localStorage:', { storedCode, storedDeviceId });
          
          setAuthParams({
            code: storedCode,
            device_id: storedDeviceId
          });
          
          // Очищаем localStorage
          localStorage.removeItem('vk_callback_code');
          localStorage.removeItem('vk_callback_device_id');
          localStorage.removeItem('vk_callback_state');
          localStorage.removeItem('vk_callback_timestamp');
          
          // Обменяем code на token
          exchangeCodeForToken(storedCode, storedDeviceId);
        } else {
          // Слишком старые данные - очищаем
          localStorage.removeItem('vk_callback_code');
          localStorage.removeItem('vk_callback_device_id');
          localStorage.removeItem('vk_callback_state');
          localStorage.removeItem('vk_callback_timestamp');
        }
      }
    };

    checkForCallbackParams();
  }, []);

  const handleVKAuth = useCallback(() => {
    if (pkceLoading || !codeChallenge || isAuthInProgress) {
      console.error('PKCE not ready yet or auth in progress');
      return;
    }

    setIsAuthInProgress(true);
    setError(null);

    // Генерируем уникальный state для защиты от CSRF
    const state = Math.random().toString(36).substring(2) + 
                  Date.now().toString(36);
    
    localStorage.setItem('vk_auth_state', state);

    const vkAuthUrl = `https://id.vk.com/authorize?client_id=54360856&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=phone&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    
    // Открываем окно с определенными размерами
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      vkAuthUrl,
      'VK Auth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=no`
    );
    
    if (!popup) {
      setError('Браузер заблокировал всплывающее окно. Разрешите всплывающие окна для этого сайта.');
      setIsAuthInProgress(false);
      return;
    }
    
    setAuthWindow(popup);
    
    // Таймаут для авторизации (5 минут)
    setTimeout(() => {
      if (isAuthInProgress && authWindow) {
        console.log('Auth timeout - closing window');
        authWindow.close();
        setAuthWindow(null);
        setIsAuthInProgress(false);
        setError('Время авторизации истекло. Попробуйте снова.');
      }
    }, 5 * 60 * 1000);
    
  }, [codeChallenge, pkceLoading, isAuthInProgress, redirectUri]);

  const exchangeCodeForToken = async (code: string, device_id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentCodeVerifier = codeVerifier || localStorage.getItem('vk_code_verifier');
      
      if (!currentCodeVerifier) {
        throw new Error('Code verifier not found');
      }

      const formData = new URLSearchParams();
      formData.append('code', code);
      formData.append('client_id', '54360856');
      formData.append('state', 'efefefefs');
      formData.append('device_id', device_id);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', redirectUri);
      formData.append('code_verifier', currentCodeVerifier);
    
      const response = await fetch('https://id.vk.ru/oauth2/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      setTokenData(data);
      setIsTokenReceived(true);
      setShowPhoneInput(true);
      console.log('Token response:', data);

    } catch (err) {
      console.error('Error exchanging code for token:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendFinalRequest = async () => {
    if (!tokenData || !authParams.device_id || !phoneNumber) {
      console.error('Missing data for final request');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const finalBody = JSON.stringify({
        userPhone: phoneNumber, 
        accessToken: tokenData.access_token,
        deviceId: authParams.device_id,
        appId: 54360856
      });

      console.log('Sending final request with phone:', phoneNumber);

      const finalResponse = await fetch('https://test1.patrickmary.ru/api/data/open/iud_confirm_vk_phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: finalBody,
      });

      const responseText = await finalResponse.text();
      
      if (!finalResponse.ok) {
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = `Final request error! status: ${finalResponse.status}\nResponse: ${JSON.stringify(errorData, null, 2)}`;
        } catch {
          errorMessage = `Final request error! status: ${finalResponse.status}\nResponse: ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      const finallllData = JSON.parse(responseText);
      setFinalData(finallllData);
      console.log('Ура!!', finallllData);

    } catch (err) {
      console.error('Error in final request:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      console.log(isTokenReceived)
    }
  };

  // Инициализация из URL (на случай если пользователь напрямую зашел с параметрами)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const device_id = urlParams.get('device_id');

    if (code || device_id) {
      // Если есть параметры - это callback, редиректим на корень
      navigate('/');
    }
  }, [navigate]);

  const isValidPhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  };

  const isAuthButtonDisabled = loading || pkceLoading || isAuthInProgress;
  const isSendButtonDisabled = loading || !isValidPhoneNumber(phoneNumber);

  return (
    <div className="vk-auth-container">
      <div className="auth-header">
        <h1>Авторизация через VK</h1>
        <p>Для продолжения необходимо войти через VK ID</p>
      </div>

      {showPhoneInput ? (
        <div className="phone-section">
          <div className="section-header">
            <div className="step-indicator">Шаг 2</div>
            <h2>Введите номер телефона</h2>
          </div>
          
          <div className="phone-input-container">
            <label htmlFor="phone" className="phone-label">
              Номер телефона:
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+7 (900) 000-00-00"
              className="phone-input"
              disabled={loading}
            />
            {phoneNumber && !isValidPhoneNumber(phoneNumber) && (
              <p className="phone-error">Введите корректный номер телефона</p>
            )}
          </div>

          <button 
            className="send-button"
            onClick={sendFinalRequest}
            disabled={isSendButtonDisabled}
          >
            {loading ? (
              <div className="button-loading">
                <div className="spinner"></div>
                Отправка...
              </div>
            ) : (
              'Подтвердить номер телефона'
            )}
          </button>
        </div>
      ) : (
        <div className="auth-section">
          <div className="section-header">
            <div className="step-indicator">Шаг 1</div>
            <h2>Авторизация через VK</h2>
            {isAuthInProgress && (
              <div className="auth-in-progress">
                <div className="spinner small"></div>
                <span>Ожидание авторизации...</span>
              </div>
            )}
          </div>
          
          <button 
            className="vk-auth-button"
            onClick={handleVKAuth}
            disabled={isAuthButtonDisabled}
          >
            {pkceLoading || isAuthInProgress ? (
              <div className="button-loading">
                <div className="spinner"></div>
                {isAuthInProgress ? 'Авторизация...' : 'Подготовка...'}
              </div>
            ) : (
              <div className="vk-button-content">
                <svg className="vk-icon" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#fff" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm6 16.3c-.3.3-.6.4-1 .4-.3 0-.6-.1-.8-.3-.5-.3-1-.7-1.5-1-.2-.2-.4-.3-.7-.3-.3 0-.6.1-.8.3l-.6.6c-.5.5-1.3.5-1.8 0-1.1-1-2-2.2-2.7-3.5-.2-.4 0-.8.4-1 .1-.1.3-.1.4-.1.3 0 .6.2.7.4.6 1.1 1.4 2.1 2.3 3 .2.2.5.2.7 0 .3-.3.6-.6.9-.9.8-.8 1.7-1.5 2.7-2 .3-.2.7-.1.9.2.2.3.1.7-.2.9-.8.5-1.5 1.1-2.1 1.8-.3.3-.5.6-.8.8 0 0 0 0 0 0 .3.3.6.5 1 .7.5.3 1 .3 1.4 0 .3-.2.5-.5.5-.9v-1.7c0-.4.3-.7.7-.7h1.7c.4 0 .7.3.7.7v2.6c0 .5-.2.9-.6 1.2z"/>
                </svg>
                Войти через VK
              </div>
            )}
          </button>
        </div>
      )}

      {(authParams.code || authParams.device_id) && (
        <div className="info-section auth-params">
          <h3>Параметры авторизации:</h3>
          <div className="params-grid">
            <div className="param-item">
              <span className="param-label">Code:</span>
              <code className="param-value">{authParams.code}</code>
            </div>
            <div className="param-item">
              <span className="param-label">Device ID:</span>
              <code className="param-value">{authParams.device_id}</code>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="info-section error">
          <h3>Ошибка:</h3>
          <pre className="error-pre">{error}</pre>
        </div>
      )}

      {tokenData && (
        <div className="info-section token-data">
          <h3>Данные токена:</h3>
          <pre>{JSON.stringify(tokenData, null, 2)}</pre>
        </div>
      )}

      {finalData && (
        <div className="info-section final-data">
          <h3>Финальный ответ:</h3>
          <pre>{JSON.stringify(finalData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default VKAuth;