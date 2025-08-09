import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5243/api';

export const api = axios.create({ baseURL });
