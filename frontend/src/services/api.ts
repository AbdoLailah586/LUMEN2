/// <reference types="vite/client" />
import axios from 'axios';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');

export const apiClient = axios.create({
    baseURL: `${API_ROOT}/api`,

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

export const googleLogin = async (credential: string) => {
    const response = await apiClient.post('/auth/login/google', { credential });
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

export const previewCleaning = async (id: string, config: any) => {
    const response = await apiClient.post(`/cleaning/${id}/preview`, config);
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

export const downloadModel = async (modelId: string, filename?: string) => {
    const response = await apiClient.get(`/models/${modelId}/download`, {
        responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `model_${modelId}.joblib`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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

// AI Integration
export const analyzeData = async (datasetId: string) => {
    const response = await apiClient.post(`/ai/analyze-data?dataset_id=${datasetId}`);
    return response.data;
};

export const suggestCleaning = async (datasetId: string) => {
    const response = await apiClient.post(`/ai/suggest-cleaning?dataset_id=${datasetId}`);
    return response.data;
};

export const suggestFeatures = async (datasetId: string, target?: string) => {
    const response = await apiClient.post(`/ai/suggest-features?dataset_id=${datasetId}${target ? `&target=${target}` : ''}`);
    return response.data;
};

export const suggestModel = async (datasetId: string, target: string, taskType: string = "classification") => {
    const response = await apiClient.post(`/ai/suggest-model?dataset_id=${datasetId}&target=${target}&task_type=${taskType}`);
    return response.data;
};

export const chatWithAI = async (question: string, datasetId?: string) => {
    const response = await apiClient.post(`/ai/chat?question=${encodeURIComponent(question)}${datasetId ? `&dataset_id=${datasetId}` : ''}`);
    return response.data;
};

export const aiAutoClean = async (datasetId: string) => {
    const response = await apiClient.post(`/ai/auto-clean?dataset_id=${datasetId}`);
    return response.data;
};

// Computer Vision
export const getCVModels = async (taskType?: string, maxSize?: number, sortBy?: string) => {
    let url = '/cv/models';
    const params = new URLSearchParams();
    if (taskType) params.append('task_type', taskType);
    if (maxSize) params.append('max_size_mb', maxSize.toString());
    if (sortBy) params.append('sort_by', sortBy);
    if (params.toString()) url += `?${params.toString()}`;
    const response = await apiClient.get(url);
    return response.data;
};

export const getCVModel = async (slug: string) => {
    const response = await apiClient.get(`/cv/models/${slug}`);
    return response.data;
};

export const recommendCVModels = async (params: any) => {
    const formData = new FormData();
    Object.keys(params).forEach(key => formData.append(key, params[key]));
    const response = await apiClient.post('/cv/models/recommend', formData);
    return response.data;
};

export const runCVInference = async (image: File, modelSlug: string) => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('model_slug', modelSlug);
    const response = await apiClient.post('/cv/inference', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const runCVBatchInference = async (images: File[], modelSlug: string) => {
    const formData = new FormData();
    images.forEach(img => formData.append('images', img));
    formData.append('model_slug', modelSlug);
    const response = await apiClient.post('/cv/batch-inference', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const runCVEnsemble = async (image: File, modelSlugs: string[], strategy: string) => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('model_slugs', modelSlugs.join(','));
    formData.append('strategy', strategy);
    const response = await apiClient.post('/cv/ensemble', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const startCVFineTune = async (dataset: File, config: any) => {
    const formData = new FormData();
    formData.append('dataset', dataset);
    Object.keys(config).forEach(key => formData.append(key, config[key]));
    const response = await apiClient.post('/cv/fine-tune', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const getCVFineTuneStatus = async (jobId: string) => {
    const response = await apiClient.get(`/cv/fine-tune/${jobId}/status`);
    return response.data;
};

export const downloadCVFineTuneModel = async (jobId: string) => {
    const response = await apiClient.get(`/cv/fine-tune/${jobId}/download`, {
        responseType: 'blob'
    });
    return response.data;
};

export default apiClient;


