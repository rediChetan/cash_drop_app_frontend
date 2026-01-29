import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";

// Color constants
const COLORS = {
  magenta: '#AA056C',
  yellowGreen: '#C4CB07',
  lightPink: '#F46690',
  gray: '#64748B'
};

function LoginPage() {
    const [email, setEmail] = useState("");
    const [totp, setTotp] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(API_ENDPOINTS.LOGIN, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, totp_code: totp }),
            });
            const data = await response.json();
            if (response.ok) {
                sessionStorage.setItem('access_token', data.access);
                sessionStorage.setItem('refresh_token', data.refresh);
                sessionStorage.setItem('is_admin', String(data.is_admin));
                setMessage("Login successful!");
                console.log('Login successful, is_admin:', data.is_admin);
                navigate(data.is_admin ? '/dashboard' : '/cd-dashboard');
            } else {
                setMessage(data.error || "Login failed.");
            }
        } catch (error) {
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                setMessage(`Cannot connect to server. Please make sure the backend server is running.`);
            } else {
                setMessage("Error: " + error.message);
            }
            console.error("Login error:", error);
        }
    };

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
                            Login to your account
                        </h1>
                        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block mb-2 font-medium" style={{ fontSize: '12px', color: COLORS.gray }}>Your email</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 outline-none"
                                    style={{ fontSize: '12px' }}
                                    placeholder="test@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="totp" className="block mb-2 font-medium" style={{ fontSize: '12px', color: COLORS.gray }}>Google Authenticator Code</label>
                                <input
                                    type="text"
                                    id="totp"
                                    value={totp}
                                    onChange={(e) => setTotp(e.target.value)}
                                    className="bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 outline-none"
                                    style={{ fontSize: '12px' }}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full text-white font-medium rounded-lg px-5 py-2.5 text-center transition"
                                style={{ backgroundColor: COLORS.magenta, fontSize: '12px' }}
                            >
                                Login
                            </button>
                        </form>
                        {message && (
                            <p className={`mt-4 text-center font-bold ${message.includes('successful') ? 'text-green-600' : 'text-red-500'}`} style={{ fontSize: '12px' }}>
                                {message}
                            </p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LoginPage;
