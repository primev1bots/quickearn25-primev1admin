import React, { useState, useEffect } from 'react';
import { ref, set, get, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaUpload, FaCog, FaWallet, FaCreditCard } from 'react-icons/fa';

interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  status: 'active' | 'inactive';
  minWithdrawal: number;
  createdAt: string;
  updatedAt: string;
}

interface WalletConfig {
  currency: string;
  currencySymbol: string;
  defaultMinWithdrawal: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const AdminPanel: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [walletConfig, setWalletConfig] = useState<WalletConfig>({
    currency: 'USDT',
    currencySymbol: '$',
    defaultMinWithdrawal: 10,
    maintenanceMode: false,
    maintenanceMessage: 'Wallet is under maintenance. Please try again later.'
  });
  const [loading, setLoading] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form states
  const [methodName, setMethodName] = useState('');
  const [methodLogo, setMethodLogo] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState(10);
  const [methodStatus, setMethodStatus] = useState<'active' | 'inactive'>('active');

  // Cloudinary configuration
  const cloudName = 'deu1ngeov';
  const uploadPreset = 'ml_default'; // You'll need to create this in Cloudinary

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      
      // Load payment methods
      const methodsRef = ref(database, 'paymentMethods');
      const methodsSnapshot = await get(methodsRef);
      
      if (methodsSnapshot.exists()) {
        const methodsData = methodsSnapshot.val();
        const methodsArray: PaymentMethod[] = Object.keys(methodsData).map(key => ({
          id: key,
          ...methodsData[key]
        }));
        setPaymentMethods(methodsArray);
      }

      // Load wallet configuration
      const configRef = ref(database, 'walletConfig');
      const configSnapshot = await get(configRef);
      
      if (configSnapshot.exists()) {
        setWalletConfig(configSnapshot.val());
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      alert('Error loading wallet data');
    } finally {
      setLoading(false);
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('cloud_name', cloudName);

      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        if (data.secure_url) {
          resolve(data.secure_url);
        } else {
          reject(new Error('Upload failed'));
        }
      })
      .catch(error => reject(error));
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadImageToCloudinary(file);
      setMethodLogo(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!methodName.trim() || !methodLogo.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const newMethod: Omit<PaymentMethod, 'id'> = {
        name: methodName.trim(),
        logo: methodLogo,
        status: methodStatus,
        minWithdrawal: minWithdrawal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newMethodRef = ref(database, `paymentMethods/${Date.now()}`);
      await set(newMethodRef, newMethod);

      // Reset form
      setMethodName('');
      setMethodLogo('');
      setMinWithdrawal(10);
      setMethodStatus('active');
      setShowAddForm(false);

      // Reload data
      await loadWalletData();
      
      alert('Payment method added successfully!');
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Error adding payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingMethod || !methodName.trim() || !methodLogo.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const updatedMethod: PaymentMethod = {
        ...editingMethod,
        name: methodName.trim(),
        logo: methodLogo,
        status: methodStatus,
        minWithdrawal: minWithdrawal,
        updatedAt: new Date().toISOString()
      };

      const methodRef = ref(database, `paymentMethods/${editingMethod.id}`);
      await update(methodRef, updatedMethod);

      // Reset form
      setEditingMethod(null);
      setMethodName('');
      setMethodLogo('');
      setMinWithdrawal(10);
      setMethodStatus('active');

      // Reload data
      await loadWalletData();
      
      alert('Payment method updated successfully!');
    } catch (error) {
      console.error('Error updating payment method:', error);
      alert('Error updating payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const methodRef = ref(database, `paymentMethods/${methodId}`);
      await remove(methodRef);

      // Reload data
      await loadWalletData();
      
      alert('Payment method deleted successfully!');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      alert('Error deleting payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWalletConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const configRef = ref(database, 'walletConfig');
      await set(configRef, walletConfig);
      
      alert('Wallet configuration updated successfully!');
    } catch (error) {
      console.error('Error updating wallet config:', error);
      alert('Error updating wallet configuration');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setMethodName(method.name);
    setMethodLogo(method.logo);
    setMinWithdrawal(method.minWithdrawal);
    setMethodStatus(method.status);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingMethod(null);
    setMethodName('');
    setMethodLogo('');
    setMinWithdrawal(10);
    setMethodStatus('active');
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setMethodName('');
    setMethodLogo('');
    setMinWithdrawal(10);
    setMethodStatus('active');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600 rounded-2xl">
            <FaWallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Wallet Management</h2>
            <p className="text-blue-200">Manage payment methods and wallet settings</p>
          </div>
        </div>
      </div>

      {/* Wallet Configuration */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-3xl p-8 border border-blue-500/20 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-6">
          <FaCog className="w-6 h-6 text-blue-400" />
          <h3 className="text-2xl font-bold text-white">Wallet Configuration</h3>
        </div>
        
        <form onSubmit={handleUpdateWalletConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-300 mb-2">
                Currency Name
              </label>
              <input
                type="text"
                value={walletConfig.currency}
                onChange={(e) => setWalletConfig({...walletConfig, currency: e.target.value})}
                className="w-full p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="e.g., USDT, BUSD, INR"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-300 mb-2">
                Currency Symbol
              </label>
              <input
                type="text"
                value={walletConfig.currencySymbol}
                onChange={(e) => setWalletConfig({...walletConfig, currencySymbol: e.target.value})}
                className="w-full p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="e.g., $, ₹, €"
                maxLength={3}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-300 mb-2">
                Default Minimum Withdrawal
              </label>
              <input
                type="number"
                value={walletConfig.defaultMinWithdrawal}
                onChange={(e) => setWalletConfig({...walletConfig, defaultMinWithdrawal: parseFloat(e.target.value)})}
                className="w-full p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                min="1"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-300 mb-2">
                Maintenance Mode
              </label>
              <div className="flex items-center space-x-3 p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30">
                <input
                  type="checkbox"
                  checked={walletConfig.maintenanceMode}
                  onChange={(e) => setWalletConfig({...walletConfig, maintenanceMode: e.target.checked})}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-white text-sm font-medium">
                  {walletConfig.maintenanceMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {walletConfig.maintenanceMode && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-300 mb-2">
                Maintenance Message
              </label>
              <textarea
                value={walletConfig.maintenanceMessage}
                onChange={(e) => setWalletConfig({...walletConfig, maintenanceMessage: e.target.value})}
                rows={3}
                className="w-full p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                placeholder="Enter maintenance message..."
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Updating Configuration...</span>
              </div>
            ) : (
              'Update Configuration'
            )}
          </button>
        </form>
      </div>

      {/* Payment Methods Management */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-3xl p-8 border border-blue-500/20 shadow-2xl backdrop-blur-sm">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <FaCreditCard className="w-6 h-6 text-blue-400" />
            <h3 className="text-2xl font-bold text-white">Payment Methods</h3>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg"
          >
            <FaPlus className="w-4 h-4" />
            <span>Add New Method</span>
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingMethod) && (
          <div className="bg-gradient-to-br from-blue-800/40 to-purple-800/40 rounded-3xl p-8 mb-8 border-2 border-blue-500/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-xl">
                {editingMethod ? <FaEdit className="w-5 h-5 text-white" /> : <FaPlus className="w-5 h-5 text-white" />}
              </div>
              <h4 className="text-xl font-bold text-white">
                {editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
              </h4>
            </div>
            
            <form onSubmit={editingMethod ? handleEditPaymentMethod : handleAddPaymentMethod} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-blue-300 mb-2">
                    Method Name *
                  </label>
                  <input
                    type="text"
                    value={methodName}
                    onChange={(e) => setMethodName(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="e.g., bKash, PayPal, Binance"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-blue-300 mb-2">
                    Minimum Withdrawal *
                  </label>
                  <input
                    type="number"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(parseFloat(e.target.value))}
                    className="w-full p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-blue-300 mb-2">
                    Status *
                  </label>
                  <select
                    value={methodStatus}
                    onChange={(e) => setMethodStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-900/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    required
                  >
                    <option value="active" className="bg-blue-900">Active</option>
                    <option value="inactive" className="bg-blue-900">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-blue-300 mb-2">
                    Logo Upload *
                  </label>
                  <div className="flex space-x-4 items-start">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="w-full p-4 rounded-2xl border-2 border-dashed border-blue-500/50 bg-blue-900/30 text-white hover:bg-blue-800/40 transition-all duration-300 text-center flex items-center justify-center space-x-2 min-h-[60px]">
                        <FaUpload className="w-5 h-5" />
                        <span className="font-medium">
                          {uploadingImage ? 'Uploading...' : 'Choose Image (Max 2MB)'}
                        </span>
                      </div>
                    </label>
                    
                    {methodLogo && (
                      <div className="w-20 h-20 rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-blue-900/30 p-1">
                        <img 
                          src={methodLogo} 
                          alt="Method logo" 
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || uploadingImage || !methodName.trim() || !methodLogo.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 shadow-lg"
                >
                  <FaSave className="w-4 h-4" />
                  <span>
                    {loading ? 'Saving...' : (editingMethod ? 'Update Method' : 'Add Method')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={editingMethod ? cancelEdit : cancelAdd}
                  disabled={loading}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 shadow-lg"
                >
                  <FaTimes className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment Methods List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-300 text-lg font-medium">Loading payment methods...</p>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-blue-900/30 rounded-3xl flex items-center justify-center">
              <FaCreditCard className="w-10 h-10 text-blue-400" />
            </div>
            <p className="text-blue-300 text-lg font-medium">No payment methods found.</p>
            <p className="text-blue-200">Add your first payment method to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`bg-gradient-to-br from-blue-800/40 to-purple-800/40 rounded-3xl p-6 border-2 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  method.status === 'active' 
                    ? 'border-green-500/30 hover:border-green-500/50' 
                    : 'border-red-500/30 hover:border-red-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-blue-900/30 p-1">
                      <img 
                        src={method.logo} 
                        alt={method.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-lg">{method.name}</h5>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        method.status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {method.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-blue-900/30">
                    <span className="text-blue-300 font-medium">Min Withdrawal:</span>
                    <span className="text-white font-bold">
                      {walletConfig.currencySymbol}{method.minWithdrawal}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2">
                    <span className="text-blue-300">Created:</span>
                    <span className="text-white">
                      {new Date(method.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => startEdit(method)}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <FaEdit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <FaTrash className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;