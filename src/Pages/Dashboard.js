import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";

// Color constants
const COLORS = {
  magenta: '#AA056C',
  yellowGreen: '#C4CB07',
  lightPink: '#F46690',
  gray: '#64748B'
};

const EditUserModal = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(user.id, formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
                <h3 className="font-bold mb-4" style={{ fontSize: '18px', color: COLORS.gray }}>Edit User: {user.name}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="name" className="block font-bold mb-2" style={{ fontSize: '12px', color: COLORS.gray }}>Name:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500"
                            style={{ fontSize: '12px' }}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="email" className="block font-bold mb-2" style={{ fontSize: '12px', color: COLORS.gray }}>Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            readOnly
                            className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight bg-gray-200"
                            style={{ fontSize: '12px' }}
                        />
                    </div>
                    <div className="mb-6 flex items-center">
                        <input
                            type="checkbox"
                            id="is_admin"
                            name="is_admin"
                            checked={formData.is_admin}
                            onChange={handleChange}
                            className="mr-2 leading-tight w-4 h-4"
                            style={{ accentColor: COLORS.magenta }}
                        />
                        <label htmlFor="is_admin" className="font-bold" style={{ fontSize: '12px', color: COLORS.gray }}>Is Admin</label>
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
                            style={{ backgroundColor: COLORS.yellowGreen, fontSize: '12px' }}
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
                            style={{ backgroundColor: COLORS.gray, fontSize: '12px' }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [users, setUsers] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('access_token'));
    const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('is_admin') === 'true');
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });

    const showStatusMessage = (text, type = 'info') => {
        setStatusMessage({ show: true, text, type });
        setTimeout(() => setStatusMessage({ show: false, text: '', type: 'info' }), 5000);
    };

    const refreshToken = async () => {
        const refreshToken = sessionStorage.getItem('refresh_token');
        if (!refreshToken) {
            setError("No refresh token found. Please log in again.");
            setIsLoggedIn(false);
            setIsAdmin(false);
            return null;
        }
        try {
            const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });
            if (response.ok) {
                const data = await response.json();
                sessionStorage.setItem('access_token', data.access);
                return data.access;
            } else {
                const errorData = await response.json();
                console.error("Token refresh failed:", errorData);
                throw new Error(errorData.detail || 'Token refresh failed');
            }
        } catch (error) {
            console.error("Token refresh error:", error);
            sessionStorage.clear();
            setIsLoggedIn(false);
            setIsAdmin(false);
            return null;
        }
    };

    const fetchUsers = async () => {
        if (!isLoggedIn || !isAdmin) {
            setLoading(false);
            setError("Not logged in or not an admin.");
            return;
        }
        let accessToken = sessionStorage.getItem('access_token');
        if (!accessToken) {
            setError("No access token found. Please log in again.");
            setLoading(false);
            setIsLoggedIn(false);
            setIsAdmin(false);
            return;
        }
        try {
            let response = await fetch(API_ENDPOINTS.USERS, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (response.status === 401) {
                accessToken = await refreshToken();
                if (accessToken) {
                    response = await fetch(API_ENDPOINTS.USERS, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    });
                } else {
                    setError("Authentication failed. Please log in again.");
                    setLoading(false);
                    return;
                }
            }
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched users:", data);
                setUsers(data);
                setError('');
            } else {
                const errorData = await response.json();
                setError(`Failed to fetch users: ${errorData.detail || response.statusText}`);
                if (response.status === 403) {
                    setError("You are not authorized to view this page.");
                    sessionStorage.clear();
                    setIsLoggedIn(false);
                    setIsAdmin(false);
                }
            }
        } catch (error) {
            setError("Error fetching users: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [isLoggedIn, isAdmin]);

    const handleEdit = (user) => {
        setCurrentUserToEdit(user);
        setShowEditModal(true);
    };

    const handleUpdateUser = async (userId, formData) => {
        let accessToken = sessionStorage.getItem('access_token');
        if (!accessToken) {
            showStatusMessage("No access token found. Please log in again.", 'error');
            sessionStorage.clear();
            setIsLoggedIn(false);
            setIsAdmin(false);
            return;
        }
        // Exclude email from the payload since it's read-only
        const { name, is_admin } = formData;
        const payload = { name, is_admin };
        try {
            let response = await fetch(API_ENDPOINTS.USER_BY_ID(userId), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });
            if (response.status === 401) {
                accessToken = await refreshToken();
                if (accessToken) {
                    response = await fetch(API_ENDPOINTS.USER_BY_ID(userId), {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify(payload),
                    });
                } else {
                    showStatusMessage("Authentication failed. Please log in again.", 'error');
                    return;
                }
            }
            if (response.ok) {
                showStatusMessage("User updated successfully!", 'success');
                setShowEditModal(false);
                setCurrentUserToEdit(null);
                fetchUsers();
            } else {
                const errorData = await response.json();
                console.error("Update failed:", response.status, errorData);
                showStatusMessage(`Failed to update user: ${errorData.detail || response.statusText}`, 'error');
            }
        } catch (error) {
            console.error("Error during update:", error);
            showStatusMessage("Error during update: " + error.message, 'error');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return;
        }
        let accessToken = sessionStorage.getItem('access_token');
        if (!accessToken) {
            showStatusMessage("No access token found. Please log in again.", 'error');
            sessionStorage.clear();
            setIsLoggedIn(false);
            setIsAdmin(false);
            return;
        }
        try {
            let response = await fetch(API_ENDPOINTS.USER_BY_ID(userId), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (response.status === 401) {
                accessToken = await refreshToken();
                if (accessToken) {
                    response = await fetch(API_ENDPOINTS.USER_BY_ID(userId), {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    });
                } else {
                    showStatusMessage("Authentication failed. Please log in again.", 'error');
                    return;
                }
            }
            if (response.ok) {
                showStatusMessage("User deleted successfully!", 'success');
                fetchUsers();
            } else {
                const errorData = await response.json();
                console.error("Delete failed:", response.status, errorData);
                showStatusMessage(`Failed to delete user: ${errorData.detail || response.statusText}`, 'error');
            }
        } catch (error) {
            console.error("Error during delete:", error);
            showStatusMessage("Error during delete: " + error.message, 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: COLORS.magenta }}></div>
                    <p className="mt-4" style={{ fontSize: '12px', color: COLORS.gray }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isLoggedIn || !isAdmin) {
        return <Navigate to="/login" />;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '12px', color: COLORS.gray }}>
            {/* Status Message */}
            {statusMessage.show && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                    statusMessage.type === 'error' ? 'bg-red-100 border-l-4 border-red-500' : 
                    statusMessage.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 
                    'bg-blue-100 border-l-4 border-blue-500'
                }`}>
                    <p className={`font-bold ${statusMessage.type === 'error' ? 'text-red-700' : statusMessage.type === 'success' ? 'text-green-700' : 'text-blue-700'}`} style={{ fontSize: '12px' }}>
                        {statusMessage.text}
                    </p>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b bg-white">
                    <h2 className="font-black uppercase italic tracking-tighter" style={{ fontSize: '24px' }}>Admin <span style={{ color: COLORS.magenta }}>Dashboard</span></h2>
                    <p className="text-[10px] font-bold tracking-widest uppercase mt-1" style={{ color: COLORS.gray, fontSize: '12px' }}>User Management</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500">
                        <p className="font-bold text-red-700" style={{ fontSize: '12px' }}>{error}</p>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-[10px] font-black uppercase border-b" style={{ color: COLORS.gray }}>
                                <th className="p-4" style={{ fontSize: '12px' }}>ID</th>
                                <th className="p-4" style={{ fontSize: '12px' }}>Name</th>
                                <th className="p-4" style={{ fontSize: '12px' }}>Email</th>
                                <th className="p-4" style={{ fontSize: '12px' }}>Admin</th>
                                <th className="p-4" style={{ fontSize: '12px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? users.map(user => (
                                <tr key={user.id} className="border-b hover:bg-pink-50/30 transition-colors">
                                    <td className="p-4 font-bold" style={{ fontSize: '12px' }}>{user.id}</td>
                                    <td className="p-4 font-bold" style={{ fontSize: '12px' }}>{user.name}</td>
                                    <td className="p-4" style={{ fontSize: '12px' }}>{user.email}</td>
                                    <td className="p-4">
                                        {user.is_admin ? (
                                            <span className="px-2 py-1 rounded text-xs font-bold uppercase" style={{ backgroundColor: COLORS.yellowGreen + '20', color: COLORS.yellowGreen, fontSize: '12px' }}>
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded text-xs font-bold uppercase" style={{ backgroundColor: COLORS.gray + '20', color: COLORS.gray, fontSize: '12px' }}>
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="px-3 py-1 rounded font-bold transition"
                                                style={{ backgroundColor: COLORS.lightPink, color: 'white', fontSize: '12px' }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="px-3 py-1 rounded font-bold transition"
                                                style={{ backgroundColor: COLORS.gray, color: 'white', fontSize: '12px' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center italic font-bold uppercase tracking-widest" style={{ color: COLORS.gray, fontSize: '12px' }}>
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showEditModal && currentUserToEdit && (
                <EditUserModal
                    user={currentUserToEdit}
                    onClose={() => {
                        setShowEditModal(false);
                        setCurrentUserToEdit(null);
                    }}
                    onSave={handleUpdateUser}
                />
            )}
        </div>
    );
};

export default Dashboard;
