
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  Languages, 
  Euro, 
  RefreshCw, 
  AlertTriangle, 
  Globe, 
  Fuel, 
  DollarSign, 
  Wrench, 
  ChevronDown, 
  TrendingUp,
  Save,
  History,
  Trash2,
  Download,
  Calendar,
  XCircle,
  Calculator,
  LogOut,
  Shield,
  User as UserIcon,
  Gauge,
  ArrowRightLeft
} from 'lucide-react';
import { DICTIONARY, TAX_RATES, FUEL_CONSUMPTION_L_PER_100KM } from './constants';
import { Language, Currency, CalculationResults, SavedTrip, User } from './types';
import { fetchEurPlnRate } from './services/geminiService';
import { initAuth, getCurrentUser, logout } from './services/authService';
import Login from './Login';
import AdminPanel from './AdminPanel';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'calculator' | 'admin'>('calculator');

  // --- APP STATE ---
  const [lang, setLang] = useState<Language>('pl');
  const [isEuroMode, setIsEuroMode] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number>(4.30);
  const [isFetchingRate, setIsFetchingRate] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const [tripDate, setTripDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [distance, setDistance] = useState<number | ''>('');
  
  // Revenue Inputs
  const [isRatePerKmMode, setIsRatePerKmMode] = useState<boolean>(false);
  const [freightAmount, setFreightAmount] = useState<number | ''>('');
  const [ratePerKm, setRatePerKm] = useState<number | ''>('');
  
  const [customFuelPrice, setCustomFuelPrice] = useState<number>(5.00);
  const [customTollCost, setCustomTollCost] = useState<number>(0.40);
  const [customServiceCost, setCustomServiceCost] = useState<number>(0.65);
  // New state for fuel consumption, default to constant
  const [fuelConsumption, setFuelConsumption] = useState<number>(FUEL_CONSUMPTION_L_PER_100KM);
  
  const [taxResidency, setTaxResidency] = useState<string>('Polska');
  const [isCustomCostsOpen, setIsCustomCostsOpen] = useState<boolean>(false);

  // History Filter State
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => {
    try {
      const saved = localStorage.getItem('transportCalculator_savedTrips');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse saved trips", e);
      return [];
    }
  });

  // --- DERIVED VALUES ---
  const dict = DICTIONARY[lang];
  const currentCitRate = TAX_RATES[taxResidency].rate;

  // --- EFFECTS ---
  
  // Auth Initialization
  useEffect(() => {
    initAuth();
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem('transportCalculator_savedTrips', JSON.stringify(savedTrips));
  }, [savedTrips]);

  // --- AUTH ACTIONS ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setView('calculator');
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setView('calculator');
  };

  // --- ACTIONS ---

  const handleFetchRate = async () => {
    if (isFetchingRate) return;
    setIsFetchingRate(true);
    setRateError(null);
    try {
      const rate = await fetchEurPlnRate();
      setExchangeRate(rate);
    } catch (err) {
      setRateError(dict.rateFetchError(exchangeRate.toFixed(4)));
    } finally {
      setIsFetchingRate(false);
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'pl' ? 'en' : 'pl');
  };

  // --- CALCULATIONS ---

  const results: CalculationResults = useMemo(() => {
    const dist = typeof distance === 'number' ? distance : 0;
    
    // Determine raw revenue input based on mode
    let revenueInput = 0;
    if (isRatePerKmMode) {
      const rate = typeof ratePerKm === 'number' ? ratePerKm : 0;
      revenueInput = dist * rate;
    } else {
      revenueInput = typeof freightAmount === 'number' ? freightAmount : 0;
    }

    // Convert revenue to PLN if in Euro mode
    let totalRevenuePln = revenueInput;
    if (isEuroMode && revenueInput > 0) {
      totalRevenuePln = revenueInput * exchangeRate;
    }

    const fuelConsumptionPerKm = fuelConsumption / 100;
    const totalFuelCost = dist * fuelConsumptionPerKm * customFuelPrice;
    const totalTollCost = dist * customTollCost;
    const totalServiceCost = dist * customServiceCost;
    const totalOperationalCost = totalFuelCost + totalTollCost + totalServiceCost;

    const earningsBeforeTax = totalRevenuePln - totalOperationalCost;
    
    // Tax only on positive earnings
    const taxCost = earningsBeforeTax > 0 ? earningsBeforeTax * currentCitRate : 0;
    const totalNetProfit = earningsBeforeTax - taxCost;

    return {
      totalFuelCost,
      totalTollCost,
      totalServiceCost,
      totalOperationalCost,
      earningsBeforeTax,
      taxCost,
      suggestedPrice: totalOperationalCost, // Breakeven point
      totalRevenue: totalRevenuePln,
      totalNetProfit,
      netProfitPerKm: dist > 0 ? totalNetProfit / dist : 0,
      km: dist,
      fuelPrice: customFuelPrice,
      tollCostPerKm: customTollCost,
      serviceCostPerKm: customServiceCost
    };
  }, [
    distance, 
    freightAmount, 
    ratePerKm,
    isRatePerKmMode,
    isEuroMode, 
    exchangeRate, 
    customFuelPrice, 
    customTollCost, 
    customServiceCost,
    fuelConsumption,
    currentCitRate
  ]);

  // --- HISTORY ACTIONS ---

  const handleSaveTrip = () => {
    const newTrip: SavedTrip = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      date: tripDate,
      inputs: {
        distance,
        freightAmount,
        ratePerKm,
        isRatePerKmMode,
        customFuelPrice,
        customTollCost,
        customServiceCost,
        fuelConsumption, 
        taxResidency,
        isEuroMode,
        exchangeRate
      },
      summary: {
        totalNetProfit: results.totalNetProfit,
        currency: isEuroMode ? 'EUR' : 'PLN'
      }
    };

    setSavedTrips(prev => [newTrip, ...prev]);
  };

  const handleLoadTrip = (trip: SavedTrip) => {
    const { inputs } = trip;
    if (trip.date) setTripDate(trip.date);
    setDistance(inputs.distance);
    setFreightAmount(inputs.freightAmount);
    // Load new fields, with backward compatibility fallback
    setRatePerKm(inputs.ratePerKm || '');
    setIsRatePerKmMode(inputs.isRatePerKmMode || false);
    
    setCustomFuelPrice(inputs.customFuelPrice);
    setCustomTollCost(inputs.customTollCost);
    setCustomServiceCost(inputs.customServiceCost);
    setFuelConsumption(inputs.fuelConsumption || FUEL_CONSUMPTION_L_PER_100KM);
    setTaxResidency(inputs.taxResidency);
    setIsEuroMode(inputs.isEuroMode);
    setExchangeRate(inputs.exchangeRate);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTrip = (id: string) => {
    setSavedTrips(prev => prev.filter(t => t.id !== id));
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // --- FILTERING & SUMMARY ---

  const filteredTrips = useMemo(() => {
    return savedTrips.filter(trip => {
      if (!filterStartDate && !filterEndDate) return true;
      const tDate = trip.date || new Date(trip.timestamp).toISOString().split('T')[0];
      if (filterStartDate && tDate < filterStartDate) return false;
      if (filterEndDate && tDate > filterEndDate) return false;
      return true;
    });
  }, [savedTrips, filterStartDate, filterEndDate]);

  const periodSummary = useMemo(() => {
    let totalProfit = 0;
    let totalKm = 0;

    filteredTrips.forEach(trip => {
      totalProfit += trip.summary.totalNetProfit;
      const dist = typeof trip.inputs.distance === 'number' ? trip.inputs.distance : 0;
      totalKm += dist;
    });

    return { totalProfit, totalKm };
  }, [filteredTrips]);


  // --- FORMATTING HELPERS ---

  const formatMoney = (value: number, currency: Currency = 'PLN') => {
    const actualLocale = currency === 'EUR' ? 'de-DE' : 'pl-PL';
    return new Intl.NumberFormat(actualLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatResultCurrency = (valuePln: number, forceCurrency?: Currency) => {
    const targetCurrency = forceCurrency || (isEuroMode ? 'EUR' : 'PLN');
    let displayValue = valuePln;
    if (targetCurrency === 'EUR') {
      displayValue = valuePln / exchangeRate;
    }
    return formatMoney(displayValue, targetCurrency);
  };

  const getUnitRateDisplay = (ratePln: number, unit: string) => {
    const currency = isEuroMode ? 'EUR' : 'PLN';
    let value = ratePln;
    if (isEuroMode) {
      value = ratePln / exchangeRate;
    }
    const rateText = new Intl.NumberFormat(currency === 'EUR' ? 'de-DE' : 'pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
    
    return `${rateText} ${currency}/${unit}`;
  };

  const getDisplayDate = (trip: SavedTrip) => {
    if (trip.date) return trip.date;
    return new Date(trip.timestamp).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US');
  };

  // --- CONDITIONAL RENDERING ---

  if (!currentUser) {
    return <Login dict={dict} onLogin={handleLogin} />;
  }

  if (view === 'admin') {
    return <AdminPanel dict={dict} onBack={() => setView('calculator')} />;
  }

  // Calculate disabled status for save button
  const isInputValid = distance && (isRatePerKmMode ? ratePerKm : freightAmount);

  return (
    <div className="p-4 sm:p-10 font-sans min-h-screen">
      <div className="max-w-3xl mx-auto">
        
        {/* --- HEADER CONTROLS & USER INFO --- */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-700 bg-white px-3 py-2 rounded-full shadow-sm border border-gray-200">
             <UserIcon className="w-4 h-4 text-blue-600" />
             <span className="font-medium">{dict.welcomeUser(currentUser.username)}</span>
             {currentUser.role === 'admin' && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">ADMIN</span>}
          </div>

          <div className="flex space-x-3">
             {currentUser.role === 'admin' && (
                <button
                  onClick={() => setView('admin')}
                  className="p-2 sm:px-4 sm:py-2 rounded-full sm:rounded-lg bg-white text-blue-600 hover:bg-gray-50 border border-gray-200 transition flex items-center shadow-sm"
                  title={dict.adminPanelButton}
                >
                  <Shield className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">{dict.adminPanelButton}</span>
                </button>
             )}
            <button
              onClick={toggleLanguage}
              className="p-3 rounded-full transition duration-150 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-md"
              title={dict.languageButton}
            >
              <Languages className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 rounded-full transition duration-150 bg-white hover:bg-red-50 text-red-500 border border-gray-200 shadow-md"
              title={dict.logoutButton}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- TITLE --- */}
        <header className="text-center mb-10">
          <Truck className="w-12 h-12 mx-auto text-blue-600 mb-3" />
          <h1 className="text-4xl font-extrabold text-gray-900">{dict.headerTitle}</h1>
          <p className="text-lg text-gray-600 mt-2">{dict.headerSubtitle}</p>
        </header>

        {/* --- MAIN INPUTS --- */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl mb-6 border-t-4 border-blue-600">
          
          {/* Currency Settings */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-gray-200 pb-4 gap-4 sm:gap-0">
            <h2 className="text-xl font-bold text-gray-800">{dict.currencySettingsTitle}</h2>
            <div className="flex items-center space-x-3">
              <Euro className={`w-6 h-6 transition-colors ${isEuroMode ? 'text-blue-600' : 'text-gray-400'}`} />
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={isEuroMode}
                  onChange={(e) => setIsEuroMode(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-lg font-medium text-gray-900">{dict.euroModeToggle}</span>
              </label>
              
              <button
                onClick={handleFetchRate}
                disabled={isFetchingRate}
                className="p-2 rounded-full transition duration-150 bg-blue-50 hover:bg-blue-100 text-blue-600 disabled:opacity-50"
                title={dict.refreshRateTitle}
              >
                <RefreshCw className={`w-5 h-5 ${isFetchingRate ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Rate Error Message */}
          {rateError && (
            <div className="flex items-center p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 mr-3" />
              <div>{rateError}</div>
            </div>
          )}

          {/* Current Rate Display */}
          <div className="mb-6 p-3 bg-blue-50 rounded-lg text-blue-700 font-medium border border-blue-100">
            <span className="text-gray-600">{dict.currentRateLabel}</span> 1 EUR = <strong className="text-gray-900">{formatMoney(exchangeRate, 'PLN')}</strong>
          </div>

          <div className="space-y-6">
            
            {/* Trip Date Input */}
            <div>
              <label htmlFor="tripDate" className="block text-lg font-medium text-gray-700 mb-2">
                {dict.tripDateLabel}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="tripDate"
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="w-full pl-10 p-4 border border-gray-300 rounded-lg text-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                />
              </div>
            </div>

            {/* Distance Input */}
            <div>
              <label htmlFor="distance" className="block text-lg font-medium text-gray-700 mb-2">
                {dict.distanceLabel}
              </label>
              <input
                id="distance"
                type="number"
                min="0"
                placeholder={dict.distancePlaceholder}
                value={distance}
                onChange={(e) => setDistance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full p-4 border border-gray-300 rounded-lg text-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              />
            </div>

            {/* Calculation Mode Toggle */}
            <div className="flex items-center justify-end">
               <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={isRatePerKmMode}
                  onChange={(e) => setIsRatePerKmMode(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                <span className="ml-3 text-sm font-medium text-gray-600 flex items-center">
                  <ArrowRightLeft className="w-4 h-4 mr-1"/>
                  {dict.calcModeToggle}
                </span>
              </label>
            </div>

            {/* Conditional Input: Freight OR Rate */}
            {isRatePerKmMode ? (
              <div>
                <label htmlFor="ratePerKm" className="block text-lg font-medium text-gray-700 mb-2">
                  {dict.ratePerKmLabel(isEuroMode ? 'EUR' : 'PLN')}
                </label>
                <input
                  id="ratePerKm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={dict.ratePerKmPlaceholder}
                  value={ratePerKm}
                  onChange={(e) => setRatePerKm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full p-4 border border-gray-300 rounded-lg text-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="freight" className="block text-lg font-medium text-gray-700 mb-2">
                  {dict.freightAmountLabel(isEuroMode ? 'EUR' : 'PLN')}
                </label>
                <input
                  id="freight"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={dict.freightAmountPlaceholder}
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full p-4 border border-gray-300 rounded-lg text-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                />
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSaveTrip}
                disabled={!isInputValid}
                className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-5 h-5 mr-2" />
                {dict.saveTripButton}
              </button>
            </div>
          </div>
        </div>

        {/* --- CUSTOM COSTS ACCORDION --- */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl mb-10 border-t-4 border-gray-400">
          <button 
            onClick={() => setIsCustomCostsOpen(!isCustomCostsOpen)}
            className="flex justify-between items-center w-full text-lg font-bold text-gray-800 focus:outline-none group"
          >
            <span>{dict.customCostsTitle}</span>
            <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isCustomCostsOpen ? 'rotate-180' : 'rotate-0'}`} />
          </button>

          {isCustomCostsOpen && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <p className="text-sm text-gray-500">{dict.customCostsHint}</p>
              
              {/* Tax Residency */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  {dict.taxResidencyLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TAX_RATES).map(([country, data]) => (
                    <button
                      key={country}
                      onClick={() => setTaxResidency(country)}
                      className={`px-3 py-1 text-sm rounded-lg border transition duration-150 ${
                        taxResidency === country 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {data.flag} {country} ({(data.rate * 100).toFixed(1)}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuel Price */}
              <div className="flex items-center justify-between">
                <label htmlFor="fuelPrice" className="flex items-center text-sm font-medium text-gray-700 w-1/2">
                  <Fuel className="w-4 h-4 mr-2 text-green-600" />
                  {dict.fuelPriceLabel}
                </label>
                <input
                  id="fuelPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customFuelPrice}
                  onChange={(e) => setCustomFuelPrice(parseFloat(e.target.value))}
                  className="w-1/2 p-2 border border-gray-300 rounded-lg text-base focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>

              {/* Avg Fuel Consumption (New) */}
              <div className="flex items-center justify-between">
                <label htmlFor="fuelConsumption" className="flex items-center text-sm font-medium text-gray-700 w-1/2">
                  <Gauge className="w-4 h-4 mr-2 text-purple-600" />
                  {dict.fuelConsumptionLabel}
                </label>
                <input
                  id="fuelConsumption"
                  type="number"
                  step="0.1"
                  min="0"
                  value={fuelConsumption}
                  onChange={(e) => setFuelConsumption(parseFloat(e.target.value))}
                  className="w-1/2 p-2 border border-gray-300 rounded-lg text-base focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>

              {/* Toll Cost */}
              <div className="flex items-center justify-between">
                <label htmlFor="tollCost" className="flex items-center text-sm font-medium text-gray-700 w-1/2">
                  <DollarSign className="w-4 h-4 mr-2 text-yellow-600" />
                  {dict.tollCostLabel}
                </label>
                <input
                  id="tollCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customTollCost}
                  onChange={(e) => setCustomTollCost(parseFloat(e.target.value))}
                  className="w-1/2 p-2 border border-gray-300 rounded-lg text-base focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>

              {/* Service Cost */}
              <div className="flex items-center justify-between">
                <label htmlFor="serviceCost" className="flex items-center text-sm font-medium text-gray-700 w-1/2">
                  <Wrench className="w-4 h-4 mr-2 text-blue-600" />
                  {dict.serviceCostLabel}
                </label>
                <input
                  id="serviceCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customServiceCost}
                  onChange={(e) => setCustomServiceCost(parseFloat(e.target.value))}
                  className="w-1/2 p-2 border border-gray-300 rounded-lg text-base focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>

              {/* CIT Rate Display */}
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-600">{dict.citOverheadLabel}</span>
                <span className="text-base font-bold text-gray-900">
                  {(currentCitRate * 100).toFixed(1)}% ({taxResidency})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* --- RESULTS PANEL --- */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-3">
            {isEuroMode ? dict.resultsTitleEur : dict.resultsTitlePln}
          </h2>

          {/* Revenue */}
          <div className="p-4 rounded-lg bg-indigo-50 text-indigo-700 mb-6 border border-indigo-100">
            <div className="flex justify-between items-center">
              <span className="text-xl font-extrabold flex items-center">
                <DollarSign className="w-6 h-6 mr-3" /> {dict.totalRevenueTitle}
              </span>
              <span className="text-3xl font-black">{formatResultCurrency(results.totalRevenue)}</span>
            </div>
            <p className="text-sm mt-1 text-indigo-600/80">
              {dict.distanceDisplayLabel} <span>{results.km}</span> km
            </p>
          </div>

          {/* Operational Costs Breakdown */}
          <h3 className="text-xl font-bold text-gray-700 mb-4">{dict.costsSectionTitle}</h3>
          <div className="space-y-4">
            {/* Fuel */}
            <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 text-green-700 border border-green-100">
              <div className="flex items-center">
                <Fuel className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-base font-semibold">{dict.costFuel(getUnitRateDisplay(results.fuelPrice, 'L'), fuelConsumption)}</span>
              </div>
              <span className="text-lg font-bold">{formatResultCurrency(results.totalFuelCost)}</span>
            </div>
            {/* Tolls */}
            <div className="flex justify-between items-center p-4 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-base font-semibold">{dict.costToll(getUnitRateDisplay(results.tollCostPerKm, 'km'))}</span>
              </div>
              <span className="text-lg font-bold">{formatResultCurrency(results.totalTollCost)}</span>
            </div>
            {/* Service */}
            <div className="flex justify-between items-center p-4 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
              <div className="flex items-center">
                <Wrench className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-base font-semibold">{dict.costService(getUnitRateDisplay(results.serviceCostPerKm, 'km'))}</span>
              </div>
              <span className="text-lg font-bold">{formatResultCurrency(results.totalServiceCost)}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
            {/* Total Op Cost */}
            <div className="flex justify-between items-center p-4 rounded-lg bg-red-50 text-red-700 font-extrabold border border-red-100">
              <span className="text-xl">{dict.totalOpCostTitle}</span>
              <span className="text-2xl">{formatResultCurrency(results.totalOperationalCost)}</span>
            </div>

            {/* EBT */}
            <h3 className="text-xl font-bold text-gray-700 mb-4 pt-4 border-t border-gray-200">{dict.profitBeforeTaxTitle}</h3>
            <div className="flex justify-between items-center p-4 rounded-lg bg-orange-50 text-orange-700 font-extrabold border border-orange-100">
              <span className="text-xl">{dict.earningsBeforeTaxTitle}</span>
              <span className="text-2xl">{formatResultCurrency(results.earningsBeforeTax)}</span>
            </div>

            {/* CIT */}
            <div className="flex justify-between items-center p-4 rounded-lg bg-purple-50 text-purple-700 font-extrabold border border-purple-100">
              <span className="text-xl">
                {dict.taxCostTitle(`${(currentCitRate * 100).toFixed(1)}%`)}
              </span>
              <span className="text-2xl">{formatResultCurrency(results.taxCost)}</span>
            </div>
          </div>

          {/* --- NET PROFIT SUMMARY --- */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 space-y-6">
            <h3 className="text-xl font-bold text-gray-700 mb-4">{dict.profitSectionTitle}</h3>

            {/* Total Net Profit */}
            <div className={`flex justify-between items-center p-5 rounded-lg shadow-xl ${
                results.totalNetProfit >= 0 
                ? 'bg-green-600 text-white' 
                : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
              <span className="text-xl font-extrabold flex items-center">
                <TrendingUp className="w-6 h-6 mr-3" /> {dict.totalNetProfitTitle}
              </span>
              <span className="text-3xl font-black">{formatResultCurrency(results.totalNetProfit)}</span>
            </div>

            {/* Net Profit per KM */}
            <div className={`flex justify-between items-center p-4 rounded-lg border ${
                results.totalNetProfit >= 0 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <span className="text-lg font-bold">{dict.netProfitPerKmTitle}</span>
              <span className="text-2xl font-bold">{formatResultCurrency(results.netProfitPerKm)}</span>
            </div>
          </div>

          {/* Suggested Price */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
              <span className="text-sm font-semibold">{dict.suggestedPriceTitle}</span>
              <span className="text-xl font-bold">{formatResultCurrency(results.suggestedPrice)}</span>
            </div>
          </div>
        </div>

        {/* --- HISTORY PANEL --- */}
        <div className="mt-10 bg-white p-6 sm:p-8 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <History className="w-6 h-6 mr-3 text-blue-600" />
            {dict.historyTitle}
          </h2>

          {/* Filters */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">{dict.filterDateFrom}</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">{dict.filterDateTo}</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {dict.clearFilters}
                </button>
              )}
            </div>
          </div>

          {/* Summary Card (Visible if there are trips to show) */}
          {filteredTrips.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center text-blue-800">
              <div className="flex items-center mb-2 sm:mb-0">
                <Calculator className="w-6 h-6 mr-3 text-blue-600" />
                <span className="font-bold text-lg">
                  {(filterStartDate || filterEndDate) ? dict.periodSummaryTitle : dict.allHistorySummaryTitle}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">{dict.periodTotalDistance} <span className="font-bold">{periodSummary.totalKm} km</span></div>
                <div className="text-xl font-extrabold">{dict.periodTotalProfit} <span>{formatResultCurrency(periodSummary.totalProfit)}</span></div>
              </div>
            </div>
          )}

          {savedTrips.length === 0 ? (
            <p className="text-gray-500 text-center py-6">{dict.noHistory}</p>
          ) : filteredTrips.length === 0 ? (
             <p className="text-gray-500 text-center py-6">Brak wyników dla wybranych filtrów.</p>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map((trip) => {
                const isProfitable = trip.summary.totalNetProfit >= 0;
                
                return (
                  <div key={trip.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="mb-3 sm:mb-0">
                      <div className="text-sm text-gray-500 mb-1 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {getDisplayDate(trip)}
                      </div>
                      <div className="font-semibold text-gray-700">
                        {trip.inputs.distance} km • {TAX_RATES[trip.inputs.taxResidency].flag} {trip.inputs.taxResidency}
                      </div>
                      <div className={`font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                         {dict.totalNetProfitTitle}: {formatResultCurrency(trip.summary.totalNetProfit)}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleLoadTrip(trip)}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {dict.loadButton}
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {dict.deleteButton}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
