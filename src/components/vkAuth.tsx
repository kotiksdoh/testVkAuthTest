import React, { useEffect, useState } from 'react';
const usePKCE = () => {
  const [codeVerifier, setCodeVerifier] = useState<string>('');
  const [codeChallenge, setCodeChallenge] = useState<string>('');
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
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      setCodeVerifier(verifier);
      setCodeChallenge(challenge);

      // Сохраняем в localStorage для использования после редиректа
      localStorage.setItem('vk_code_verifier', verifier);
    };

    generatePKCE();
  }, []);

  return { codeVerifier, codeChallenge };
};

const { codeChallenge } = usePKCE();

const VKAuth: React.FC = () => {
  const [authParams, setAuthParams] = useState<{ code: string | null; device_id: string | null }>({
    code: null,
    device_id: null
  });
  const [tokenData, setTokenData] = useState<any>(null);
  const [finalData, setFinalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleVKAuth = () => {
    const redirectUri = 'https://test-vk-auth-test-75j1.vercel.app/'
    const vkAuthUrl = `https://id.vk.com/authorize?client_id=54352865&redirect_uri=${redirectUri}&response_type=code&scope=&state=efefefefs&code_challenge=${codeChallenge}&code_challenge_method=S256`
    location.assign(vkAuthUrl);
  };

  const exchangeCodeForToken = async (code: string, device_id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new URLSearchParams();
      formData.append('code', code);
      formData.append('client_id', '54352865');
      formData.append('state', 'ldsaldsal');
      formData.append('device_id', device_id);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', 'https://test-vk-auth-test-75j1.vercel.app/');
      formData.append('code_verifier', `${codeChallenge}`);
    
      const response = await fetch('https://id.vk.ru/oauth2/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTokenData(data);
      console.log('Token response:', data);

      const finalBody = JSON.stringify({
        userPhone: '+79182291909',
        accessToken: data,
        deviceId: device_id,
        appId: 54352865
      });

      const finalResponse = await fetch('https://test1.patrickmary.ru/api/data/open/iud_confirm_vk_phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: finalBody,
      });

      if (!finalResponse.ok) {
        throw new Error(`Final request error! status: ${finalResponse.status}`);
      }

      const finallllData = await finalResponse.json();
      setFinalData(finallllData);
      console.log('Ура!!', finallllData);

    } catch (err) {
      console.error('Error exchanging code for token:', err);
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

  return (
    <div className="vk-auth-container">
      {(authParams.code || authParams.device_id) && (
        <div className="auth-params">
          <h3>Параметры авторизации:</h3>
          <p><strong>Code:</strong> {authParams.code}</p>
          <p><strong>Device ID:</strong> {authParams.device_id}</p>
        </div>
      )}

      {loading && (
        <div className="loading">
          <p>Получение токена...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <h3>Ошибка:</h3>
          <p>{error}</p>
        </div>
      )}

      {tokenData && (
        <div className="token-data">
          <h3>Данные токена:</h3>
          <pre>{JSON.stringify(tokenData, null, 2)}</pre>
        </div>
      )}

      {finalData && (
        <div className="final-data">
          <h3>Финальный ответ:</h3>
          <pre>{JSON.stringify(finalData, null, 2)}</pre>
        </div>
      )}

      <button 
        className="vk-auth-button"
        onClick={handleVKAuth}
        disabled={loading}
      >
        <div className="vk-button-content">
          <svg className="vk-icon" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#fff" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm6 16.3c-.3.3-.6.4-1 .4-.3 0-.6-.1-.8-.3-.5-.3-1-.7-1.5-1-.2-.2-.4-.3-.7-.3-.3 0-.6.1-.8.3l-.6.6c-.5.5-1.3.5-1.8 0-1.1-1-2-2.2-2.7-3.5-.2-.4 0-.8.4-1 .1-.1.3-.1.4-.1.3 0 .6.2.7.4.6 1.1 1.4 2.1 2.3 3 .2.2.5.2.7 0 .3-.3.6-.6.9-.9.8-.8 1.7-1.5 2.7-2 .3-.2.7-.1.9.2.2.3.1.7-.2.9-.8.5-1.5 1.1-2.1 1.8-.3.3-.5.6-.8.8 0 0 0 0 0 0 .3.3.6.5 1 .7.5.3 1 .3 1.4 0 .3-.2.5-.5.5-.9v-1.7c0-.4.3-.7.7-.7h1.7c.4 0 .7.3.7.7v2.6c0 .5-.2.9-.6 1.2z"/>
          </svg>
          Войти через VK
        </div>
      </button>
    </div>
  );
};

export default VKAuth;