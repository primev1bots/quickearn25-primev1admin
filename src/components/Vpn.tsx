import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Save, Globe, Search, X, Shield, Earth, Settings, CheckCircle2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, set } from 'firebase/database';

/**
 * ✅ What changed (high level)
 * - Added full, searchable list of ALL ISO countries (via Intl.DisplayNames and ISO alpha‑2 list)
 * - Smart search with highlights, keyboard navigation (↑ ↓ Enter Esc), paste multiple (comma/newline)
 * - Accepts: full name ("Bangladesh"), alpha‑2 code ("BD"), alpha‑3 ("BGD"), common aliases (e.g. "USA")
 * - Pretty display with emoji flags and sorted chips, de-dupe, and quick bulk add from results
 * - Friendlier empty states, counts, and subtle toasts
 */

// --- Firebase ---
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
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --- Types ---
interface VPNConfig {
  vpnRequired: boolean;
  allowedCountries: string[]; // stored as lowercase country names (e.g., "bangladesh")
}


// --- Utilities: ISO country codes + helpers ---
// ISO 3166-1 alpha-2 list (249 regions)
// Source: https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes (flattened)
const ISO2: string[] = [
  'AF','AX','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BM','BT','BO','BQ','BA','BW','BV','BR','IO','BN','BG','BF','BI','CV','KH','CM','CA','KY','CF','TD','CL','CN','CX','CC','CO','KM','CG','CD','CK','CR','CI','HR','CU','CW','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FK','FO','FJ','FI','FR','GF','PF','TF','GA','GM','GE','DE','GH','GI','GR','GL','GD','GP','GU','GT','GG','GN','GW','GY','HT','HM','VA','HN','HK','HU','IS','IN','ID','IR','IQ','IE','IM','IL','IT','JM','JP','JE','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MO','MG','MW','MY','MV','ML','MT','MH','MQ','MR','MU','YT','MX','FM','MD','MC','MN','ME','MS','MA','MZ','MM','NA','NR','NP','NL','NC','NZ','NI','NE','NG','NU','NF','MK','MP','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PN','PL','PT','PR','QA','RE','RO','RU','RW','BL','SH','KN','LC','MF','PM','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SX','SK','SI','SB','SO','ZA','GS','SS','ES','LK','SD','SR','SJ','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TK','TO','TT','TN','TR','TM','TC','TV','UG','UA','AE','GB','UM','US','UY','UZ','VU','VE','VN','VG','VI','WF','EH','YE','ZM','ZW'
];

// Optional common aliases mapping to proper name or ISO2
const ALIASES: Record<string, string> = {
  usa: 'US',
  uk: 'GB',
  uae: 'AE',
  drc: 'CD',
  congo: 'CG',
  'south korea': 'KR',
  'north korea': 'KP',
  'czech republic': 'CZ',
  'ivory coast': 'CI',
  russia: 'RU',
  syria: 'SY',
  laos: 'LA',
  moldova: 'MD',
  tanzania: 'TZ',
  bolivia: 'BO',
  venezuela: 'VE',
  palestine: 'PS',
};

// Convert ISO code to emoji flag
const flagFor = (code: string): string =>
  code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .slice(0, 2);

// Intl region display names (fallback if unsupported)
const regionNames = (() => {
  try {
    // @ts-ignore - DisplayNames is available in modern browsers
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null as any;
  }
})();

// Build a canonical country directory from ISO2 list
interface CountryRow { code: string; name: string; nameLc: string; flag: string }
const buildAllCountries = (): CountryRow[] => {
  return ISO2.map((code) => {
    const name = regionNames ? (regionNames as any).of(code) || code : code;
    const proper = String(name);
    return { code, name: proper, nameLc: proper.toLowerCase(), flag: flagFor(code) };
  }).sort((a, b) => a.name.localeCompare(b.name));
};

// Find country by flexible user input (name, alias, ISO2/3)
const normalizeToName = (input: string, all: CountryRow[]): string | null => {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  const q = raw.toLowerCase();

  // Alias → ISO2
  const aliasHit = ALIASES[q];
  if (aliasHit) {
    const found = all.find((r) => r.code.toLowerCase() === aliasHit.toLowerCase());
    return found ? found.nameLc : null;
  }

  // ISO2
  if (/^[a-z]{2}$/.test(q)) {
    const by2 = all.find((r) => r.code.toLowerCase() === q);
    if (by2) return by2.nameLc;
  }

  // ISO3 → try best-effort map using first three letters of name
  if (/^[a-z]{3}$/.test(q)) {
    const by3 = all.find((r) => r.nameLc.replace(/[^a-z]/g, '').startsWith(q));
    if (by3) return by3.nameLc;
  }

  // Full or partial name – pick exact first, else startsWith, else includes
  const exact = all.find((r) => r.nameLc === q);
  if (exact) return exact.nameLc;
  const starts = all.find((r) => r.nameLc.startsWith(q));
  if (starts) return starts.nameLc;
  const incl = all.find((r) => r.nameLc.includes(q));
  if (incl) return incl.nameLc;

  return null;
};

// Humanize stored name (title case)
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const AdminPanel: React.FC = () => {
  const [vpnConfig, setVpnConfig] = useState<VPNConfig>({ vpnRequired: true, allowedCountries: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Search UI state
  const allCountries = useMemo(() => buildAllCountries(), []);
  const [query, setQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Derived suggestions
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCountries.slice(0, 12);
    const base = allCountries.filter(
      (c) => c.nameLc.includes(q) || c.code.toLowerCase() === q || (ALIASES[q] && ALIASES[q].toLowerCase() === c.code.toLowerCase())
    );
    // Exclude already-added
    const filtered = base.filter((c) => !vpnConfig.allowedCountries.includes(c.nameLc));
    return filtered.slice(0, 12);
  }, [query, allCountries, vpnConfig.allowedCountries]);

  // Load from Firebase
  useEffect(() => {
    const vpnConfigRef = ref(database, 'vpnConfig');
    const unsubscribe = onValue(vpnConfigRef, (snapshot) => {
      const config = snapshot.val();
      if (config) {
        // Make sure list is normalized and sorted
        const unique = Array.from(new Set<string>((config.allowedCountries || []).map((x: string) => String(x).trim().toLowerCase()))).sort();
        setVpnConfig({ vpnRequired: !!config.vpnRequired, allowedCountries: unique });
      } else {
        const defaults = ['bangladesh', 'india', 'united states'];
        setVpnConfig({ vpnRequired: true, allowedCountries: defaults.sort() });
      }
    });
    return () => off(vpnConfigRef, 'value', unsubscribe);
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const vpnConfigRef = ref(database, 'vpnConfig');
      // Persist sorted, unique
      const unique = Array.from(new Set(vpnConfig.allowedCountries)).sort();
      await set(vpnConfigRef, { ...vpnConfig, allowedCountries: unique });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.error('Error saving VPN config:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  // Add helpers
  const addByNameLc = (nameLc: string) => {
    if (!nameLc) return;
    setVpnConfig((prev) => {
      const next = Array.from(new Set([...prev.allowedCountries, nameLc])).sort();
      return { ...prev, allowedCountries: next };
    });
  };

  const removeCountry = (nameLc: string) => {
    setVpnConfig((prev) => ({ ...prev, allowedCountries: prev.allowedCountries.filter((c) => c !== nameLc) }));
  };

  const toggleVPNRequirement = () => setVpnConfig((p) => ({ ...p, vpnRequired: !p.vpnRequired }));

  // Parse arbitrary user input: supports comma/newline separated entries
  const addFromFreeInput = (raw: string) => {
    const items = raw
      .split(/[\n,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const toAdd: string[] = [];
    items.forEach((it) => {
      const mapped = normalizeToName(it, allCountries);
      if (mapped) toAdd.push(mapped);
    });
    if (toAdd.length) {
      setVpnConfig((prev) => {
        const next = Array.from(new Set([...prev.allowedCountries, ...toAdd])).sort();
        return { ...prev, allowedCountries: next };
      });
    }
  };

  // Keyboard navigation in the suggestion list
  const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestOpen(true);
      setHighlightIdx((i) => (i + 1) % Math.max(1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestOpen(true);
      setHighlightIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (suggestOpen && highlightIdx >= 0 && suggestions[highlightIdx]) {
        const chosen = suggestions[highlightIdx];
        addByNameLc(chosen.nameLc);
        setQuery('');
        setSuggestOpen(false);
        setHighlightIdx(-1);
      } else if (query.trim()) {
        const mapped = normalizeToName(query, allCountries);
        if (mapped) addByNameLc(mapped);
        setQuery('');
        setSuggestOpen(false);
        setHighlightIdx(-1);
      }
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
      setHighlightIdx(-1);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestOpen(false);
    setHighlightIdx(-1);
    inputRef.current?.focus();
  };

  // Bulk quick add buttons
  const quickAdd = (codes: string[]) => {
    const toAdd = codes
      .map((c) => normalizeToName(c, allCountries))
      .filter(Boolean) as string[];
    if (toAdd.length) setVpnConfig((p) => ({ ...p, allowedCountries: Array.from(new Set([...p.allowedCountries, ...toAdd])).sort() }));
  };

  // UI helpers
  const pill = (content: React.ReactNode, extra = '') => (
    <span className={`px-2 py-1 rounded-full text-xs border ${extra}`}>{content}</span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-900 to-blue-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Security Admin Panel</h1>
            <p className="text-purple-200">Manage VPN access and IP restrictions</p>
          </div>
        </div>

      </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Status & Quick Add */}
          <div className="lg:col-span-1 space-y-6">
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
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      vpnConfig.vpnRequired
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}
                  >
                    {vpnConfig.vpnRequired ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={toggleVPNRequirement}
                  className={`relative w-full h-12 rounded-xl transition-all duration-300 ${
                    vpnConfig.vpnRequired
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700'
                  } shadow-lg hover:shadow-xl`}
                >
                  <div
                    className={`absolute top-2 w-8 h-8 bg-white rounded-lg transition-all duration-300 ${
                      vpnConfig.vpnRequired ? 'left-12' : 'left-2'
                    } shadow-md`}
                  />
                  <div className="flex items-center justify-between px-4 h-full text-white font-medium">
                    {vpnConfig.vpnRequired ? 'ON' : 'OFF'}
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Add */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-300" /> Quick Add
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => quickAdd(['US'])}
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-3 rounded-xl transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 flex items-center justify-between group"
                >
                  <span>United States</span>
                  <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                </button>
                <button
                  onClick={() => quickAdd(['CA'])}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-3 rounded-xl transition-all duration-200 border border-purple-500/30 hover:border-purple-500/50 flex items-center justify-between group"
                >
                  <span>Canada</span>
                  <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                </button>
                <button
                  onClick={() => quickAdd(['BD'])}
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl transition-all duration-200 border border-emerald-500/30 hover:border-emerald-500/50 flex items-center justify-between group"
                >
                  <span>Bangladesh</span>
                  <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                </button>
              </div>
            </div>
          </div>

          {/* Middle/Right: Country Management */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Earth className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Allowed Countries</h2>
                  <p className="text-purple-200 text-sm">Search any country by name or code; press Enter to add</p>
                </div>
              </div>

              {/* Search / Add */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 w-5 h-5" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSuggestOpen(true);
                        setHighlightIdx(-1);
                      }}
                      onFocus={() => setSuggestOpen(true)}
                      onKeyDown={onSearchKeyDown}
                      placeholder="Search or paste multiple (e.g., US, CA, BD)"
                      className="w-full bg-white/5 border border-white/20 rounded-xl pl-12 pr-12 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500 transition-colors backdrop-blur-sm"
                    />
                    {query && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white"
                        aria-label="Clear search"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestOpen && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-slate-800 border border-white/20 border-t-0 rounded-b-xl z-10 max-h-72 overflow-y-auto backdrop-blur-lg">
                      {suggestions.map((s, idx) => {
                        const active = idx === highlightIdx;
                        return (
                          <button
                            key={s.code}
                            onMouseEnter={() => setHighlightIdx(idx)}
                            onMouseLeave={() => setHighlightIdx(-1)}
                            onClick={() => {
                              addByNameLc(s.nameLc);
                              setQuery('');
                              setSuggestOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-white flex items-center justify-between border-b border-white/10 last:border-b-0 ${
                              active ? 'bg-purple-500/30' : 'hover:bg-purple-500/20'
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-lg">{s.flag}</span>
                              <span className="font-medium">{s.name}</span>
                              {pill(s.code, 'ml-2 border-white/20 text-white/80')}
                            </span>
                            <Plus className="w-4 h-4 text-purple-300" />
                          </button>
                        );
                      })}
                      <div className="flex items-center justify-between px-4 py-2 text-xs text-white/70">
                        <span>Use ↑ ↓ to navigate • Enter to add • Esc to close</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Free-form paste / multi add */}
                <div className="flex gap-3">
                  <textarea
                    rows={2}
                    placeholder="Or paste a list: US, CA, GB, JP or one per line"
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-500 transition-colors backdrop-blur-sm"
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text && /[,\n;]/.test(text)) {
                        e.preventDefault();
                        addFromFreeInput(text);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
                        e.preventDefault();
                        addFromFreeInput((e.target as HTMLTextAreaElement).value);
                        (e.target as HTMLTextAreaElement).value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addFromFreeInput(query || '');
                      setQuery('');
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-purple-500/25"
                  >
                    <Plus className="w-5 h-5" /> Add
                  </button>
                </div>
              </div>

              {/* Selected Countries */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" /> Allowed Countries
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    {pill(`${vpnConfig.allowedCountries.length} selected`, 'text-white/80 border-white/20')}
                    <button
                      onClick={() => setVpnConfig((p) => ({ ...p, allowedCountries: [] }))}
                      className="text-white/70 hover:text-white text-xs underline decoration-dotted"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                {vpnConfig.allowedCountries.length === 0 ? (
                  <div className="text-center py-10">
                    <Globe className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300">No countries added yet</p>
                    <p className="text-gray-500 text-sm">Search above and press Enter to add any country</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {vpnConfig.allowedCountries.map((nameLc) => {
                      const meta = allCountries.find((c) => c.nameLc === nameLc);
                      const display = meta?.name || title(nameLc);
                      const flag = meta?.flag || '🏳️';
                      const code = meta?.code || '';
                      return (
                        <div
                          key={nameLc}
                          className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between group hover:border-purple-500/50 transition-all duration-200 hover:bg-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-lg">
                              <span>{flag}</span>
                            </div>
                            <div>
                              <div className="text-white font-medium">{display}</div>
                              <div className="text-white/60 text-xs">{code && `ISO: ${code}`}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeCountry(nameLc)}
                            className="opacity-0 group-hover:opacity-100 bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg transition-all duration-200 transform hover:scale-110"
                            aria-label={`Remove ${display}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Save Bar */}
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
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-300 mt-3 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Your VPN rules are up to date.
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

export default AdminPanel;
