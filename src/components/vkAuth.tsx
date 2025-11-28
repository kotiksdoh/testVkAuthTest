import React, { useEffect, useState, useCallback } from 'react';

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
  
  const { codeChallenge, codeVerifier, isLoading: pkceLoading } = usePKCE();

  const handleVKAuth = useCallback(() => {
    if (pkceLoading || !codeChallenge) {
      console.error('PKCE not ready yet');
      return;
    }

    const redirectUri = 'https://test-vk-auth-test-75j1.vercel.app/';
    const vkAuthUrl = `https://id.vk.com/authorize?client_id=54352865&redirect_uri=${redirectUri}&response_type=code&scope=&state=efefefefs&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    location.assign(vkAuthUrl);
  }, [codeChallenge, pkceLoading]);

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
      formData.append('client_id', '54352865');
      formData.append('state', 'ldsaldsal');
      formData.append('device_id', device_id);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', 'https://test-vk-auth-test-75j1.vercel.app/');
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
      setShowPhoneInput(true); // Показываем поле для номера телефона
      console.log('Token response:', data);

    } catch (err) {
      console.error('Error exchanging code for token:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Функция для отправки финального запроса с номером телефона
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
        appId: 54352865
      });

      console.log('Sending final request with phone:', phoneNumber);

      const finalResponse = await fetch('https://test1.patrickmary.ru/api/data/open/iud_confirm_vk_phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: finalBody,
      });

      // Получаем полный текст ответа
      const responseText = await finalResponse.text();
      
      if (!finalResponse.ok) {
        // Пытаемся распарсить JSON ошибки, если это возможно
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = `Final request error! status: ${finalResponse.status}\nResponse: ${JSON.stringify(errorData, null, 2)}`;
        } catch {
          // Если не JSON, используем текст как есть
          errorMessage = `Final request error! status: ${finalResponse.status}\nResponse: ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      // Если ответ успешный, парсим JSON
      const finallllData = JSON.parse(responseText);
      setFinalData(finallllData);
      console.log('Ура!!', finallllData);

    } catch (err) {
      console.error('Error in final request:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const device_id = urlParams.get('device_id');

    if (code || device_id) {
      setAuthParams({
        code,
        device_id
      });

      console.log('Извлеченные параметры:', { code, device_id });

      if (code && device_id) {
        exchangeCodeForToken(code, device_id);
      }
    }
  }, []);

  // Функция для валидации номера телефона
  const isValidPhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  };

  const isAuthButtonDisabled = loading || pkceLoading;
  const isSendButtonDisabled = loading || !isValidPhoneNumber(phoneNumber);

  return (
    <div className="vk-auth-container">
      <div className="auth-header">
        <h1>Авторизация через VK</h1>
        <p>Для продолжения необходимо войти через VK ID</p>
      </div>

      {/* Поле для номера телефона показывается только после получения токена */}
      {showPhoneInput && (
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
      )}

      {/* Кнопка авторизации VK */}
      {!showPhoneInput && (
        <div className="auth-section">
          <div className="section-header">
            <div className="step-indicator">Шаг 1</div>
            <h2>Авторизация через VK</h2>
          </div>
          
          <button 
            className="vk-auth-button"
            onClick={handleVKAuth}
            disabled={isAuthButtonDisabled}
          >
            {pkceLoading ? (
              <div className="button-loading">
                <div className="spinner"></div>
                Подготовка...
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

      {/* Информационные блоки */}
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