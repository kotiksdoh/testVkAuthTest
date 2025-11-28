import React from 'react';



const VKAuth: React.FC = () => {
  const handleVKAuth = () => {
    const redirectUri = 'https://patrickmary.ru/'
    const vkAuthUrl = `https://id.vk.com/authorize?client_id=54352865&redirect_uri=${redirectUri}&response_type=code&scope=&state=efefefefs&code_challenge=WUJncXAtdTFiVkJGeF9WSlhURzlGMDhqNkx3eGZDeWFZWXRrMFZHMWhSOA==&code_challenge_method=S256`
    location.assign(vkAuthUrl);
  };



  return (
    <div className="vk-auth-container">
      {/* {!isAuthenticated ? ( */}
        <button 
          className="vk-auth-button"
          onClick={handleVKAuth}
        >
          <div className="vk-button-content">
            <svg className="vk-icon" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#fff" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm6 16.3c-.3.3-.6.4-1 .4-.3 0-.6-.1-.8-.3-.5-.3-1-.7-1.5-1-.2-.2-.4-.3-.7-.3-.3 0-.6.1-.8.3l-.6.6c-.5.5-1.3.5-1.8 0-1.1-1-2-2.2-2.7-3.5-.2-.4 0-.8.4-1 .1-.1.3-.1.4-.1.3 0 .6.2.7.4.6 1.1 1.4 2.1 2.3 3 .2.2.5.2.7 0 .3-.3.6-.6.9-.9.8-.8 1.7-1.5 2.7-2 .3-.2.7-.1.9.2.2.3.1.7-.2.9-.8.5-1.5 1.1-2.1 1.8-.3.3-.5.6-.8.8 0 0 0 0 0 0 .3.3.6.5 1 .7.5.3 1 .3 1.4 0 .3-.2.5-.5.5-.9v-1.7c0-.4.3-.7.7-.7h1.7c.4 0 .7.3.7.7v2.6c0 .5-.2.9-.6 1.2z"/>
            </svg>
            Войти через VK
          </div>
        </button>
      {/* ) : ( */}
        {/* <div className="user-info">
          <h3>Успешная авторизация!</h3>
          <p>User ID: {userData?.user_id}</p>
          <p>Email: {userData?.email || 'Не указан'}</p>
          <button onClick={handleLogout} className="logout-button">
            Выйти
          </button>
        </div>
      )} */}
    </div>
  );
};

export default VKAuth;