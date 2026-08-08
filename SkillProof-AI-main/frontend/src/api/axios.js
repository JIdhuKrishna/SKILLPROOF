import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        // Get token from local storage
        const user = JSON.parse(localStorage.getItem('skillproof_user'));

        // If token is present, add it to request headers
        if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
