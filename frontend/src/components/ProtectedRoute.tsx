import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    const token = localStorage.getItem('token');
    
    // If there is no token, redirect to login page
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // If token exists, render the child routes
    return <Outlet />;
};

export default ProtectedRoute;
