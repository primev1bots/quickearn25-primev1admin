import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Globe, Search, X, Shield, Earth, Settings } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB-ij-FWOgRmBF9vWcJ16PqJjGLA8HGkF0",
  authDomain: "quickearn25bot.firebaseapp.com",
  databaseURL: "https://quickearn25bot-default-rtdb.firebaseio.com",
  projectId: "quickearn25bot",
  storageBucket: "quickearn25bot.firebasestorage.app",
  messagingSenderId: "835656750621",
  appId: "1:835656750621:web:73babcd3b45114ff2098f4",
  measurementId: "G-3D9VT454PS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

interface VPNConfig {
  vpnRequired: boolean;
  allowedCountries: string[];
}

// Country name to code mapping for display purposes only
const countryNameMapping: { [key: string]: string } = {
  'usa': 'united states',
  'ca': 'canada',
};

const AdminPanel: React.FC = () => {
  const [vpnConfig, setVpnConfig] = useState<VPNConfig>({
    vpnRequired: true,
    allowedCountries: []
  });
  const [newCountry, setNewCountry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const vpnConfigRef = ref(database, 'vpnConfig');
    
    const unsubscribe = onValue(vpnConfigRef, (snapshot) => {
      const config = snapshot.val();
      if (config) {
        setVpnConfig(config);
      } else {
        // Initialize with default values if no config exists
        const defaultConfig: VPNConfig = {
          vpnRequired: true,
          allowedCountries: ['united states', 'canada', 'japan']
        };
        setVpnConfig(defaultConfig);
      }
    });

    return () => {
      off(vpnConfigRef, 'value', unsubscribe);
    };
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const vpnConfigRef = ref(database, 'vpnConfig');
      await set(vpnConfigRef, vpnConfig);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving VPN config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert input to proper country name
  const normalizeCountryName = (input: string): string => {
    const trimmed = input.trim().toLowerCase();
    
    // Check if it's a country code and map to full name
    if (countryNameMapping[trimmed]) {
      return countryNameMapping[trimmed];
    }
    
    // If it's already a full name, return as is
    return trimmed;
  };

  const addCountry = (country: string = newCountry) => {
    const countryToAdd = normalizeCountryName(country);
    if (countryToAdd && !vpnConfig.allowedCountries.includes(countryToAdd)) {
      setVpnConfig(prev => ({
        ...prev,
        allowedCountries: [...prev.allowedCountries, countryToAdd]
      }));
      setNewCountry('');
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const removeCountry = (country: string) => {
    setVpnConfig(prev => ({
      ...prev,
      allowedCountries: prev.allowedCountries.filter(c => c !== country)
    }));
  };

  const toggleVPNRequirement = () => {
    setVpnConfig(prev => ({
      ...prev,
      vpnRequired: !prev.vpnRequired
    }));
  };

  const handleManualInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newCountry.trim()) {
      addCountry();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      addCountry(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const addMultipleCountries = (countries: string[]) => {
    const normalizedCountries = countries.map(country => normalizeCountryName(country));
    const uniqueNewCountries = normalizedCountries.filter(country => 
      !vpnConfig.allowedCountries.includes(country)
    );
    
    if (uniqueNewCountries.length > 0) {
      setVpnConfig(prev => ({
        ...prev,
        allowedCountries: [...prev.allowedCountries, ...uniqueNewCountries]
      }));
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Format country name for display (capitalize each word)
  const formatCountryName = (country: string): string => {
    return country.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Common country suggestions based on search query
  const getCountrySuggestions = () => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const commonCountries = [
      'united states',
      'canada',
    ];

    return commonCountries.filter(country => 
      country.toLowerCase().includes(query) &&
      !vpnConfig.allowedCountries.includes(country)
    ).slice(0, 8);
  };

  const suggestions = getCountrySuggestions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-900 to-blue-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">VPN Guard Admin</h1>
            <p className="text-purple-200">Manage VPN access and country restrictions</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Status and Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* VPN Status Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Settings className="w-5 h-5 text-blue-300" />
              </div>
              <h2 className="text-lg font-semibold text-white">VPN Protection</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  vpnConfig.vpnRequired 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                }`}>
                  {vpnConfig.vpnRequired ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <button
                onClick={toggleVPNRequirement}
                className={`relative w-full h-12 rounded-xl transition-all duration-300 ${
                  vpnConfig.vpnRequired 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-700'
                } shadow-lg hover:shadow-xl transition-shadow`}
              >
                <div className={`absolute top-2 w-8 h-8 bg-white rounded-lg transition-all duration-300 ${
                  vpnConfig.vpnRequired ? 'left-12' : 'left-2'
                } shadow-md`} />
                <div className="flex items-center justify-between px-4 h-full text-white font-medium">
                  {vpnConfig.vpnRequired ? 'ON' : 'OFF'}
                </div>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-300" />
              Quick Add
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => addMultipleCountries(['united states'])}
                className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-3 rounded-xl transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 flex items-center justify-between group"
              >
                <span>United States</span>
                <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => addMultipleCountries(['canada'])}
                className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-3 rounded-xl transition-all duration-200 border border-purple-500/30 hover:border-purple-500/50 flex items-center justify-between group"
              >
                <span>Canada</span>
                <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column - Countries Management */}
        <div className="lg:col-span-2">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Earth className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Allowed Countries</h2>
                <p className="text-purple-200 text-sm">Manage which countries can access your service</p>
              </div>
            </div>

            {/* Search Section */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onKeyPress={handleSearchKeyPress}
                    onFocus={() => setShowSearchResults(true)}
                    placeholder="Search for countries..."
                    className="w-full bg-white/5 border border-white/20 rounded-xl pl-12 pr-12 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500 transition-colors backdrop-blur-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Search Suggestions */}
                {showSearchResults && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-slate-800 border border-white/20 border-t-0 rounded-b-xl z-10 max-h-60 overflow-y-auto backdrop-blur-lg">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => addCountry(suggestion)}
                        className="w-full px-4 py-3 text-left text-white hover:bg-purple-500/20 transition-colors border-b border-white/10 last:border-b-0 flex items-center justify-between"
                      >
                        <span>{formatCountryName(suggestion)}</span>
                        <Plus className="w-4 h-4 text-purple-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  onKeyPress={handleManualInputKeyPress}
                  placeholder="Or enter country name manually..."
                  className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500 transition-colors backdrop-blur-sm"
                />
                <button
                  onClick={() => addCountry()}
                  disabled={!newCountry.trim()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold px-6 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-purple-500/25 disabled:shadow-none"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
            </div>

            {/* Countries Grid */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  Allowed Countries
                </h3>
                <span className="bg-white/10 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {vpnConfig.allowedCountries.length} countries
                </span>
              </div>
              
              {vpnConfig.allowedCountries.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No countries added yet</p>
                  <p className="text-gray-500 text-sm">Add countries to allow access from those locations</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {vpnConfig.allowedCountries.map((country, index) => (
                    <div
                      key={index}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between group hover:border-purple-500/50 transition-all duration-200 hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Earth className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-medium">{formatCountryName(country)}</span>
                      </div>
                      <button
                        onClick={() => removeCountry(country)}
                        className="opacity-0 group-hover:opacity-100 bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg transition-all duration-200 transform hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button - Fixed at Bottom */}
      <div className="max-w-6xl mx-auto mt-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Apply Changes</h3>
              <p className="text-purple-200 text-sm">
                {saveStatus === 'success' && '✓ Changes saved successfully!'}
                {saveStatus === 'error' && '✗ Error saving changes. Please try again.'}
                {saveStatus === 'idle' && 'Save your configuration to update the VPN guard system'}
              </p>
            </div>
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-green-500/25 disabled:shadow-none transform hover:scale-105 disabled:transform-none"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;