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
                            style={{ fontSize: '14px' }}
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
                            style={{ fontSize: '14px' }}
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
    // Set page title
    useEffect(() => {
        document.title = 'Admin Dashboard';
    }, []);

    const [users, setUsers] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('access_token'));
    const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('is_admin') === 'true');
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, userName: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });
    
    // Admin Settings state
    const [settings, setSettings] = useState({
        shifts: [],
        workstations: [],
        starting_amount: 200.00,
        max_cash_drops_per_day: 10
    });
    const [originalSettings, setOriginalSettings] = useState({
        shifts: [],
        workstations: [],
        starting_amount: 200.00,
        max_cash_drops_per_day: 10
    });
    const [newShift, setNewShift] = useState('');
    const [newWorkstation, setNewWorkstation] = useState('');

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

    const fetchAdminSettings = async () => {
        let accessToken = sessionStorage.getItem('access_token');
        if (!accessToken) {
            return;
        }
        try {
            let response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (response.status === 401) {
                accessToken = await refreshToken();
                if (accessToken) {
                    response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS, {
                        headers: { 'Authorization': `Bearer ${accessToken}` },
                    });
                } else {
                    return;
                }
            }
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setOriginalSettings(JSON.parse(JSON.stringify(data))); // Deep copy
            }
        } catch (error) {
            console.error("Error fetching admin settings:", error);
        }
    };

    const updateAdminSettings = async () => {
        let accessToken = sessionStorage.getItem('access_token');
        if (!accessToken) {
            showStatusMessage("No access token found. Please log in again.", 'error');
            return;
        }
        try {
            let response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(settings),
            });
            if (response.status === 401) {
                accessToken = await refreshToken();
                if (accessToken) {
                    response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify(settings),
                    });
                } else {
                    showStatusMessage("Authentication failed. Please log in again.", 'error');
                    return;
                }
            }
            if (response.ok) {
                showStatusMessage("Settings updated successfully!", 'success');
                await fetchAdminSettings(); // Update original settings after save
            } else {
                const errorData = await response.json();
                showStatusMessage(`Failed to update settings: ${errorData.error || response.statusText}`, 'error');
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            showStatusMessage("Error updating settings: " + error.message, 'error');
        }
    };

    const addShift = () => {
        if (newShift.trim() && !settings.shifts.includes(newShift.trim())) {
            setSettings(prev => ({
                ...prev,
                shifts: [...prev.shifts, newShift.trim()]
            }));
            setNewShift('');
        }
    };

    const removeShift = (shift) => {
        setSettings(prev => ({
            ...prev,
            shifts: prev.shifts.filter(s => s !== shift)
        }));
    };

    const addWorkstation = () => {
        if (newWorkstation.trim() && !settings.workstations.includes(newWorkstation.trim())) {
            setSettings(prev => ({
                ...prev,
                workstations: [...prev.workstations, newWorkstation.trim()]
            }));
            setNewWorkstation('');
        }
    };

    const removeWorkstation = (workstation) => {
        setSettings(prev => ({
            ...prev,
            workstations: prev.workstations.filter(w => w !== workstation)
        }));
    };

    useEffect(() => {
        fetchUsers();
        fetchAdminSettings();
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

    const handleDeleteClick = (userId) => {
        const user = users.find(u => u.id === userId);
        setDeleteModal({ show: true, userId, userName: user ? user.name : '' });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.userId) return;
        
        const userId = deleteModal.userId;
        setDeleteModal({ show: false, userId: null, userName: '' });
        
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
        <div className="min-h-screen bg-gray-100 p-2 md:p-4" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '14px', color: COLORS.gray }}>
            {/* Status Message */}
            {statusMessage.show && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                    statusMessage.type === 'error' ? 'bg-red-100 border-l-4 border-red-500' : 
                    statusMessage.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 
                    'bg-blue-100 border-l-4 border-blue-500'
                }`}>
                    <p className={`font-bold ${statusMessage.type === 'error' ? 'text-red-700' : statusMessage.type === 'success' ? 'text-green-700' : 'text-blue-700'}`} style={{ fontSize: '14px' }}>
                        {statusMessage.text}
                    </p>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b bg-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="font-black uppercase italic tracking-tighter" style={{ fontSize: '24px' }}>Admin <span style={{ color: COLORS.magenta }}>Dashboard</span></h2>
                        </div>
                        <Link
                            to="/register"
                            className="text-white font-black px-4 py-2 rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-widest whitespace-nowrap"
                            style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
                        >
                            New User
                        </Link>
                    </div>
                </div>

                {/* Two Column Layout: Settings (Left) and Users (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6">
                    {/* Left Column: Admin Settings */}
                    <div className="p-4 md:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <h3 className="font-black uppercase mb-4" style={{ fontSize: '18px', color: COLORS.gray }}>Cash Drop Settings</h3>
                        <div className="space-y-6">
                            {/* Shifts */}
                            <div>
                                <label className="block font-bold mb-2" style={{ fontSize: '14px', color: COLORS.gray }}>Shifts</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newShift}
                                        onChange={(e) => setNewShift(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addShift()}
                                        placeholder="Add shift (e.g., 1, 2, 3)"
                                        className="flex-1 p-2 border rounded"
                                        style={{ fontSize: '14px' }}
                                    />
                                    <button
                                        onClick={addShift}
                                        className="px-4 py-2 text-white font-bold rounded"
                                        style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {settings.shifts.map((shift, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded">
                                            <span style={{ fontSize: '14px' }}>{shift}</span>
                                            <button
                                                onClick={() => removeShift(shift)}
                                                className="text-red-500 hover:text-red-700"
                                                style={{ fontSize: '14px' }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Workstations */}
                            <div>
                                <label className="block font-bold mb-2" style={{ fontSize: '14px', color: COLORS.gray }}>Workstations</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newWorkstation}
                                        onChange={(e) => setNewWorkstation(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addWorkstation()}
                                        placeholder="Add workstation (e.g., Register 1)"
                                        className="flex-1 p-2 border rounded"
                                        style={{ fontSize: '14px' }}
                                    />
                                    <button
                                        onClick={addWorkstation}
                                        className="px-4 py-2 text-white font-bold rounded"
                                        style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {settings.workstations.map((workstation, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded">
                                            <span style={{ fontSize: '14px' }}>{workstation}</span>
                                            <button
                                                onClick={() => removeWorkstation(workstation)}
                                                className="text-red-500 hover:text-red-700"
                                                style={{ fontSize: '14px' }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Starting Amount */}
                            <div>
                                <label className="block font-bold mb-2" style={{ fontSize: '14px', color: COLORS.gray }}>Starting Cash Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.starting_amount}
                                    onChange={(e) => setSettings(prev => ({ ...prev, starting_amount: parseFloat(e.target.value) || 0 }))}
                                    className="w-full p-2 border rounded"
                                    style={{ fontSize: '14px' }}
                                />
                            </div>

                            {/* Max Cash Drops Per Day */}
                            <div>
                                <label className="block font-bold mb-2" style={{ fontSize: '14px', color: COLORS.gray }}>Max Cash Drops Per Day</label>
                                <input
                                    type="number"
                                    value={settings.max_cash_drops_per_day}
                                    onChange={(e) => setSettings(prev => ({ ...prev, max_cash_drops_per_day: parseInt(e.target.value) || 0 }))}
                                    className="w-full p-2 border rounded"
                                    style={{ fontSize: '14px' }}
                                />
                            </div>
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={updateAdminSettings}
                                disabled={JSON.stringify(settings) === JSON.stringify(originalSettings)}
                                className={`w-full px-6 py-2 font-black rounded-lg shadow-md transition-all active:scale-95 ${
                                    JSON.stringify(settings) === JSON.stringify(originalSettings)
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'text-white'
                                }`}
                                style={{ 
                                    backgroundColor: JSON.stringify(settings) === JSON.stringify(originalSettings) 
                                        ? undefined 
                                        : COLORS.yellowGreen, 
                                    fontSize: '14px' 
                                }}
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Users List */}
                    <div className="p-4 md:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <h3 className="font-black uppercase mb-4" style={{ fontSize: '18px', color: COLORS.gray }}>User Management</h3>
                        {error && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-500 mb-4">
                                <p className="font-bold text-red-700" style={{ fontSize: '14px' }}>{error}</p>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 font-black uppercase border-b" style={{ color: COLORS.gray }}>
                                        <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>ID</th>
                                        <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Name</th>
                                        <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Email</th>
                                        <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Admin</th>
                                        <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map(user => (
                                        <tr key={user.id} className="border-b hover:bg-pink-50/30 transition-colors">
                                            <td className="p-2 md:p-4 font-bold" style={{ fontSize: '14px' }}>{user.id}</td>
                                            <td className="p-2 md:p-4 font-bold" style={{ fontSize: '14px' }}>{user.name}</td>
                                            <td className="p-2 md:p-4" style={{ fontSize: '14px' }}>{user.email}</td>
                                            <td className="p-2 md:p-4">
                                                {user.is_admin ? (
                                                    <span className="px-2 py-1 rounded font-bold uppercase" style={{ backgroundColor: COLORS.yellowGreen + '20', color: COLORS.yellowGreen, fontSize: '14px' }}>
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded font-bold uppercase" style={{ backgroundColor: COLORS.gray + '20', color: COLORS.gray, fontSize: '14px' }}>
                                                        No
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 md:p-4">
                                                <div className="flex flex-col md:flex-row gap-2">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="px-3 py-1 rounded font-bold transition"
                                                        style={{ backgroundColor: COLORS.lightPink, color: 'white', fontSize: '14px' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(user.id, user.name)}
                                                        className="px-3 py-1 rounded font-bold transition"
                                                        style={{ backgroundColor: COLORS.gray, color: 'white', fontSize: '14px' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="p-20 text-center italic font-bold uppercase tracking-widest" style={{ color: COLORS.gray, fontSize: '14px' }}>
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
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

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModal.show && deleteModal.userId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="relative max-w-md w-full bg-white rounded-lg shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-4" style={{ backgroundColor: COLORS.lightPink }}>
                            <h3 className="text-white font-black uppercase tracking-widest text-center" style={{ fontSize: '18px' }}>
                                Confirm Delete
                            </h3>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6">
                            <p className="mb-4 text-center" style={{ fontSize: '14px', color: COLORS.gray }}>
                                Are you sure you want to delete this user?
                            </p>
                            <p className="mb-6 text-center italic font-bold" style={{ fontSize: '14px', color: COLORS.lightPink }}>
                                This action cannot be undone.
                            </p>
                            
                            {/* User Details */}
                            {deleteModal.userName && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold uppercase" style={{ fontSize: '14px', color: COLORS.gray }}>User:</span>
                                        <span className="font-black" style={{ fontSize: '14px', color: COLORS.magenta }}>{deleteModal.userName}</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Buttons */}
                            <div className="flex flex-col md:flex-row gap-3">
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="flex-1 text-white font-black px-4 py-3 rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-widest"
                                    style={{ backgroundColor: COLORS.lightPink, fontSize: '14px' }}
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ show: false, userId: null, userName: '' })}
                                    className="flex-1 text-white font-black px-4 py-3 rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-widest"
                                    style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
