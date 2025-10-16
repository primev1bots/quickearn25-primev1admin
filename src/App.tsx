// App.tsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "./components/auth";

import Dashboard from "./components/Dashboard";
import Ads from "./components/Ads";
import Settings from "./components/Settings";
import Tasks from "./components/Task";
import Vpn from "./components/Vpn";
import Wallet from "./components/Wallet";
import Withdrawal from "./components/Withdrawal";
import Profile from "./components/Profile";
import TelegramNotifier from "./components/TelegramNotifier";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Logout from "./components/Logout"; // ✅ correct import

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Check auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  // 🔒 Not logged in → show Login page
  if (!user) return <Login onLogin={setUser} />;

  // ✅ Logged in → show main admin UI
  const mockTransactions = [
    {
      id: "1",
      userId: "user123",
      type: "withdrawal",
      amount: 50,
      description: "Withdrawal request",
      status: "pending" as const,
      method: "bKash",
      accountNumber: "017XXXXXXXX",
      createdAt: new Date().toISOString(),
    },
  ];

  const mockWalletConfig = {
    currency: "USDT",
    currencySymbol: "$",
    defaultMinWithdrawal: 10,
    maintenanceMode: false,
    maintenanceMessage:
      "Wallet is under maintenance. Please try again later.",
  };

  const handleUpdateTransaction = (transactionId: string, updates: any) => {
    console.log("Updating transaction:", transactionId, updates);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        setActiveTab={setActiveTab}
        activeTab={activeTab}
      />

      {/* Main content */}
      <div className="flex-1 min-h-screen p-0">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "ads" && <Ads />}
        {activeTab === "settings" && <Settings />}
        {activeTab === "tasks" && <Tasks />}
        {activeTab === "vpn" && <Vpn />}
        {activeTab === "wallet" && <Wallet />}
        {activeTab === "withdrawal" && (
          <Withdrawal
            transactions={mockTransactions}
            onUpdateTransaction={handleUpdateTransaction}
            walletConfig={mockWalletConfig}
          />
        )}
        {activeTab === "profile" && <Profile user={user} />}
        {activeTab === "notifier" && <TelegramNotifier />}
        {activeTab === "logout" && <Logout />} {/* ✅ fixed name */}
      </div>
    </div>
  );
};

export default App;
