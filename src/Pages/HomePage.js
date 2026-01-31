import React, { useEffect } from "react";
import { Link } from "react-router-dom";

// Color constants
const COLORS = {
  magenta: '#AA056C',
  yellowGreen: '#C4CB07',
  lightPink: '#F46690',
  gray: '#64748B'
};

function Homepage() {
    // Set page title
    useEffect(() => {
        document.title = 'Home';
    }, []);
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-8" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
            <div className="text-center max-w-2xl">
                <h1 className="font-bold mb-6" style={{ fontSize: '24px', color: COLORS.magenta }}>Welcome to Menchies Escondido</h1>
                <p className="mb-8" style={{ fontSize: '14px', color: COLORS.gray }}>This is the main page of our cash drop application.</p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Link 
                        to="/login" 
                        className="px-6 py-3 rounded-lg font-bold transition text-center"
                        style={{ backgroundColor: COLORS.magenta, color: 'white', fontSize: '14px' }}
                    >
                        Login
                    </Link>
                    <Link 
                        to="/cash-drop" 
                        className="px-6 py-3 rounded-lg font-bold transition border-2 text-center"
                        style={{ borderColor: COLORS.magenta, color: COLORS.magenta, fontSize: '14px' }}
                    >
                        Cash Drop Terminal
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Homepage;
