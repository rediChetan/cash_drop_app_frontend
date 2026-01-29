// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Auth endpoints
  USER_COUNT: `${API_BASE_URL}/api/auth/user-count/`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  REFRESH_TOKEN: `${API_BASE_URL}/api/auth/token/refresh`,
  CURRENT_USER: `${API_BASE_URL}/api/auth/users/me`,
  USERS: `${API_BASE_URL}/api/auth/users`,
  USER_BY_ID: (id) => `${API_BASE_URL}/api/auth/users/${id}`,
  
  // Cash Drop App endpoints
  CASH_DRAWER: `${API_BASE_URL}/api/cash-drop-app1/cash-drawer`,
  CASH_DROP: `${API_BASE_URL}/api/cash-drop-app1/cash-drop`,
  CASH_DROP_RECONCILER: `${API_BASE_URL}/api/cash-drop-app1/cash-drop-reconciler`,
  
  // Bank Drop endpoints
  BANK_DROP: `${API_BASE_URL}/api/bank-drop`,
  BANK_DROP_CASH_DROP: (id) => `${API_BASE_URL}/api/bank-drop/cash-drop/${id}`,
  BANK_DROP_UPDATE_DENOMINATIONS: (id) => `${API_BASE_URL}/api/bank-drop/cash-drop/${id}/denominations`,
  BANK_DROP_SUMMARY: `${API_BASE_URL}/api/bank-drop/summary`,
  BANK_DROP_MARK_DROPPED: `${API_BASE_URL}/api/bank-drop/mark-dropped`,
  
  // Media
  MEDIA: `${API_BASE_URL}/media`,
};

export default API_BASE_URL;
