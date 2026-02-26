import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Purchase from './components/Purchase';
import Sales from './components/Sales';
import Customers from './components/Customers';
import Suppliers from './components/Suppliers';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import Users from './components/Users';
import Settings from './components/Settings';
import Company from './components/Company';
import Accounting from './components/Accounting';
import HRM from './components/HRM';
import Backup from './components/Backup';
import Signup from './components/Signup';
import CompanySetup from './components/CompanySetup';
import PendingApproval from './components/PendingApproval';
import Returns from './components/Returns';

import { DialogProvider } from './context/DialogContext';

function App() {
    // ... rest of state remain same
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = sessionStorage.getItem('user');
        const savedPerms = sessionStorage.getItem('permissions');

        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        if (savedPerms) {
            try {
                setPermissions(JSON.parse(savedPerms));
            } catch (e) { console.error("Error parsing permissions on load", e); }
        }
        setLoading(false);

        // Network Status Listeners
        const handleOnline = () => {
            console.log("⚡ System is ONLINE. Notifying backend...");
            if (window.electronAPI && window.electronAPI.sendNetworkStatus) {
                window.electronAPI.sendNetworkStatus('online');
            }
        };

        const handleOffline = () => {
            console.log("🔌 System is OFFLINE.");
            if (window.electronAPI && window.electronAPI.sendNetworkStatus) {
                window.electronAPI.sendNetworkStatus('offline');
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleLoginSuccess = (userData, perms = []) => {
        setUser(userData);
        setPermissions(perms);
        sessionStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('permissions', JSON.stringify(perms));

        // CRITICAL: Store these for permission utility functions
        sessionStorage.setItem('companyId', userData.company_id || userData.companyId || '');
        sessionStorage.setItem('userRole', userData.role || '');

        console.log('✓ Login successful:', {
            user: userData.username,
            role: userData.role,
            companyId: userData.company_id || userData.companyId,
            permissions: perms.length
        });
    };

    const handleLogout = () => {
        setUser(null);
        setPermissions([]);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('permissions');
        sessionStorage.removeItem('companyId');
        sessionStorage.removeItem('userRole');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <DialogProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={!user ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to={(user?.role?.toLowerCase() === 'super_admin' || user?.role === 'Super Admin') ? '/company' : '/'} replace />} />
                    <Route path="/signup" element={!user ? <Signup /> : <Navigate to={(user?.role?.toLowerCase() === 'super_admin' || user?.role === 'Super Admin') ? '/company' : '/'} replace />} />
                    <Route path="/setup-company" element={!user ? <CompanySetup /> : <Navigate to={(user?.role?.toLowerCase() === 'super_admin' || user?.role === 'Super Admin') ? '/company' : '/'} replace />} />
                    <Route path="/approval-pending" element={!user ? <PendingApproval /> : <Navigate to={(user?.role?.toLowerCase() === 'super_admin' || user?.role === 'Super Admin') ? '/company' : '/'} replace />} />


                    {user ? (
                        <Route path="/*" element={
                            <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                                <Routes>
                                    <Route path="/" element={
                                        // Redirect Super Admin to Company page, regular users to Dashboard
                                        (user?.role?.toLowerCase() === 'super_admin' || user?.role === 'Super Admin')
                                            ? <Navigate to="/company" replace />
                                            : <Dashboard currentUser={user} />
                                    } />
                                    <Route path="/inventory" element={<Inventory currentUser={user} />} />
                                    <Route path="/purchase" element={<Purchase currentUser={user} />} />
                                    <Route path="/sales" element={<Sales currentUser={user} />} />
                                    <Route path="/returns" element={<Returns currentUser={user} />} />
                                    <Route path="/customers" element={<Customers currentUser={user} />} />
                                    <Route path="/suppliers" element={<Suppliers currentUser={user} />} />
                                    <Route path="/expenses" element={<Expenses currentUser={user} />} />
                                    <Route path="/reports" element={<Reports currentUser={user} />} />
                                    <Route path="/accounting" element={<Accounting currentUser={user} />} />
                                    <Route path="/hrm" element={<HRM currentUser={user} />} />
                                    <Route path="/backup" element={<Backup currentUser={user} />} />
                                    <Route path="/users" element={<Users currentUser={user} />} />
                                    <Route path="/settings" element={<Settings currentUser={user} />} />
                                    <Route path="/company" element={<Company currentUser={user} />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Layout>
                        } />
                    ) : (
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    )}
                </Routes>
            </Router>
        </DialogProvider>
    );
}

export default App;
