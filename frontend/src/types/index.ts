export interface User {
    id: string;
    email: string;
    full_name: string;
}

export interface Dataset {
    id: string;
    filename: string;
    file_size: number;
    row_count: number;
    column_count: number;
    created_at: string;
}

export interface Job {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    job_type: string;
}
