const Auth = {
  login: async (name, surname, password) => {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, surname, password })
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userName', `${data.name} ${data.surname}`);
      return data;
    }
    throw new Error('Ошибка входа');
  },
  
  register: async (name, surname, password) => {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, surname, password })
    });
    return response.ok;
  },

  getToken: () => localStorage.getItem('token'),
  getRole: () => localStorage.getItem('role'),
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.reload();
  }
};
window.Auth = Auth;