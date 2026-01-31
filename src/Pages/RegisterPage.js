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

function RegisterPage() {
    // Set page title
    useEffect(() => {
        document.title = 'Register';
    }, []);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [secret, setSecret] = useState("");
    const [qrCode, setQrCode] = useState("");
    const [message, setMessage] = useState("");
    const [userCount, setUserCount] = useState(null);
    const [checkingUsers, setCheckingUsers] = useState(true);
    const isLoggedIn = !!sessionStorage.getItem('access_token');
    const isAdminUser = sessionStorage.getItem('is_admin') === 'true';

    useEffect(() => {
        const checkUserCount = async () => {
            try {
                const response = await fetch(API_ENDPOINTS.USER_COUNT);
                if (response.ok) {
                    const data = await response.json();
                    setUserCount(data.count);
                    // If zero users, automatically set isAdmin to true for first user
                    if (data.count === 0) {
                        setIsAdmin(true);
                    }
                }
            } catch (error) {
                console.error("Error checking user count:", error);
            } finally {
                setCheckingUsers(false);
            }
        };

        checkUserCount();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // If zero users, allow registration without auth token
            const headers = {
                'Content-Type': 'application/json',
            };
            
            // Only add auth token if user is logged in
            const token = sessionStorage.getItem('access_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // If zero users, force isAdmin to true for first user
            const adminValue = userCount === 0 ? true : isAdmin;
            
            const response = await fetch(API_ENDPOINTS.USERS, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ name, email, isAdmin: adminValue }),
            });
            const data = await response.json();
            if (response.ok) {
                setSecret(data.secret);
                setQrCode(data.qr_code);
                setMessage("Scan the QR code with Google Authenticator or type the secret code in Google Authenticator.");
            } else {
                setMessage(data.error || "Registration failed.");
            }
        } catch (error) {
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                setMessage("Cannot connect to server. Please make sure the backend server is running on http://localhost:8000");
            } else {
                setMessage("Error: " + error.message);
            }
            console.error("Registration error:", error);
        }
    };

    if (checkingUsers) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: COLORS.magenta }}></div>
                    <p className="mt-4" style={{ fontSize: '12px', color: COLORS.gray }}>Loading...</p>
                </div>
            </div>
        );
    }

    // Allow registration if zero users OR if logged in as admin
    if (userCount !== null && userCount > 0 && (!isLoggedIn || !isAdminUser)) {
        return <Navigate to="/login" />;
    }

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
            <section className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
                <Link to="/" className="flex items-center mb-6" style={{ fontSize: '18px' }}>
                    <img className="mr-2 w-8 h-8" src="https://cdn.shortpixel.ai/spai2/q_lossless+w_257+to_webp+ret_img/assets.simpleviewinc.com/simpleview/image/upload/crm/santamonica/menchies-logo_ECB7D9CC-C8AC-F5BB-F5AFDAC11380689A-ecb7d95606c6631_ecb7dbfb-cc16-c67e-d50f0c45af37ba21.png" alt="Menchies Logo" />
                    <span className="font-bold" style={{ color: COLORS.magenta, fontSize: '18px' }}>Menchies Escondido</span>
                </Link>
                <div className="w-full bg-white rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0">
                    <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                        <h1 className="font-bold leading-tight tracking-tight" style={{ fontSize: '18px', color: COLORS.gray }}>
                            Create an account
                        </h1>
                        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="name" className="block mb-2 font-medium" style={{ fontSize: '12px', color: COLORS.gray }}>Employee Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    className="bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 outline-none"
                                    style={{ fontSize: '14px' }}
                                    placeholder="Your Name"
                                    required
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block mb-2 font-medium" style={{ fontSize: '12px', color: COLORS.gray }}>Your email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    className="bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 outline-none"
                                    style={{ fontSize: '14px' }}
                                    placeholder="test@example.com"
                                    required
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="admin_access" className="block mb-2 font-medium" style={{ fontSize: '12px', color: COLORS.gray }}>Admin</label>
                                <input
                                    type="checkbox"
                                    id="admin_access"
                                    name="admin_access"
                                    className="w-4 h-4 rounded focus:ring-2 focus:ring-pink-500"
                                    style={{ accentColor: COLORS.magenta }}
                                    checked={isAdmin}
                                    onChange={(e) => setIsAdmin(e.target.checked)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full text-white font-medium rounded-lg px-5 py-2.5 text-center transition"
                                style={{ backgroundColor: COLORS.magenta, fontSize: '12px' }}
                            >
                                Create New User Account
                            </button>
                        </form>
                        {qrCode && (
                            <div className="mt-4 text-center">
                                <p className="font-bold mb-2" style={{ fontSize: '12px', color: COLORS.gray }}>{message}</p>
                                <p className="mt-2 font-mono" style={{ fontSize: '12px', color: COLORS.gray }}>Secret: {secret}</p>
                                <img src={qrCode} alt="QR Code" className="mx-auto mt-2" />
                            </div>
                        )}
                        {message && !qrCode && (
                            <p className={`mt-4 font-bold text-center ${message.includes('failed') ? 'text-red-500' : 'text-green-600'}`} style={{ fontSize: '12px' }}>
                                {message}
                            </p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default RegisterPage;
