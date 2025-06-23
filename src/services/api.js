import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const BUCKET_BASE_URL = process.env.REACT_APP_BUCKET_URL || 'http://141.94.115.201';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const apiKey = process.env.API_SECRET_KEY;
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Intercepteurs pour gestion d'erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const recipeApi = {
  // CRUD Recettes
  getAllRecipes: () => api.get('/recipes'),
  getRecipe: (id) => api.get(`/recipes/${id}`),
  createRecipe: (data) => api.post('/recipes', data),
  updateRecipe: (id, data) => api.put(`/recipes/${id}`, data),
  deleteRecipe: (id) => api.delete(`/recipes/${id}`),

  // Génération en chaîne
  generateMenu: (data) => api.post('/recipes/batch/menu', data),
  generateTheme: (data) => api.post('/recipes/batch/theme', data),
  generateCustom: (data) => api.post('/recipes/batch/custom', data),

  // Storage
  getStorageInfo: () => api.get('/storage/info'),
  uploadFile: (formData) => api.post('/storage/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;