/// <reference types="vite/client" />
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Accept': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('Unauthorized! Redirecting to login...');
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        if (!error.response) {
            console.error('Network error or server down:', error);
        }
        return Promise.reject(error);
    }
);

// Auth
export const register = async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
};

export const login = async (credentials: URLSearchParams) => {
    const response = await apiClient.post('/auth/login/access-token', credentials, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return response.data;
};

// Datasets
export const getDatasets = async () => {
    const response = await apiClient.get('/datasets/');
    return response.data;
};

export const getDataset = async (id: string) => {
    const response = await apiClient.get(`/datasets/${id}`);
    return response.data;
};

export const getDatasetPreview = async (id: string) => {
    const response = await apiClient.get(`/datasets/${id}/preview`);
    return response.data;
};

export const getDatasetProfile = async (id: string) => {
    const response = await apiClient.get(`/datasets/${id}/profile`);
    return response.data;
};

export const getDatasetEda = async (id: string) => {
    const response = await apiClient.get(`/datasets/${id}/eda`);
    return response.data;
};

export const deleteDataset = async (id: string) => {
    const response = await apiClient.delete(`/datasets/${id}`);
    return response.data;
};

export const downloadDataset = async (id: string) => {
    const response = await apiClient.get(`/datasets/${id}/download`);
    return response.data;
};

// Upload
export const uploadFile = async (file: File, onProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress,
    });
    return response.data;
};

// Cleaning
export const applyCleaning = async (id: string, config: any) => {
    const response = await apiClient.post(`/cleaning/${id}/apply`, config);
    return response.data;
};

// Training
export const startTraining = async (datasetId: string, config: any) => {
    const response = await apiClient.post(`/training/${datasetId}/start`, config);
    return response.data;
};

export const getTrainingJobStatus = async (jobId: string) => {
    const response = await apiClient.get(`/training/jobs/${jobId}/status`);
    return response.data;
};

export const getRecommendedModels = async (datasetId: string) => {
    const response = await apiClient.get(`/training/${datasetId}/recommend-models`);
    return response.data;
};

export const getTrainingResults = async (jobId: string) => {
    const response = await apiClient.get(`/training/jobs/${jobId}/results`);
    return response.data;
};

export const getTrainingJobs = async () => {
    const response = await apiClient.get('/jobs/');
    return response.data;
};

// Models
export const getModel = async (modelId: string) => {
    const response = await apiClient.get(`/models/${modelId}`);
    return response.data;
};

export const downloadModel = async (modelId: string) => {
    const response = await apiClient.get(`/models/${modelId}/download`);
    return response.data;
};

// Export
export const exportCode = async (modelId: string) => {
    const response = await apiClient.get(`/export/${modelId}/code`);
    return response.data;
};

export const exportReport = async (modelId: string) => {
    const response = await apiClient.get(`/export/${modelId}/report`);
    return response.data;
};
