import React, { useState, useEffect } from 'react'; 
import { ref, set, onValue } from 'firebase/database'; 
import { database } from '../firebase'; 
import { FaTrash, FaImages, FaArrowUp, FaArrowDown, FaPercentage } from 'react-icons/fa'; 

interface AppConfig { 
  logoUrl: string; 
  appName: string; 
  sliderImages: SliderImage[]; 
  supportUrl: string; 
  tutorialVideoId: string; 
  referralCommissionRate: number; // 🆕 Added
} 

interface SliderImage { 
  id: string; 
  url: string; 
  alt: string; 
  order: number; 
  createdAt: string; 
} 

const AdminPanel: React.FC = () => { 
  const [appConfig, setAppConfig] = useState<AppConfig>({ 
    logoUrl: "", 
    appName: "", 
    sliderImages: [], 
    supportUrl: "", 
    tutorialVideoId: "",
    referralCommissionRate: 0 // 🆕 Added
  }); 
  const [logoFile, setLogoFile] = useState<File | null>(null); 
  const [sliderFiles, setSliderFiles] = useState<File[]>([]); 
  const [uploading, setUploading] = useState(false); 
  const [message, setMessage] = useState(""); 
  const [uploadProgress, setUploadProgress] = useState(0); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null); 

  useEffect(() => { 
    console.log('AdminPanel: Starting Firebase connection...'); 
    
    try { 
      const configRef = ref(database, 'appConfig'); 
      console.log('AdminPanel: Firebase ref created', configRef); 
      
      const unsubscribe = onValue(configRef, (snapshot) => { 
        console.log('AdminPanel: Firebase data received', snapshot.val()); 
        const data = snapshot.val(); 
        if (data) { 
          setAppConfig({ 
            logoUrl: data.logoUrl || "", 
            appName: data.appName || "", 
            sliderImages: data.sliderImages || [], 
            supportUrl: data.supportUrl || "", 
            tutorialVideoId: data.tutorialVideoId || "",
            referralCommissionRate: data.referralCommissionRate || 0 // 🆕 Added
          }); 
        } else { 
          console.log('AdminPanel: No data found in Firebase, using defaults'); 
        } 
        setLoading(false); 
        setError(null); 
      }, (error) => { 
        console.error('AdminPanel: Firebase read error:', error); 
        setError(`Firebase Error: ${error.message}`); 
        setLoading(false); 
      }); 

      return () => { 
        console.log('AdminPanel: Cleaning up Firebase listener'); 
        unsubscribe(); 
      }; 
    } catch (err) { 
      console.error('AdminPanel: Setup error:', err); 
      setError(`Setup Error: ${err instanceof Error ? err.message : 'Unknown error'}`); 
      setLoading(false); 
    } 
  }, []); 

  const uploadToCloudinary = async (file: File): Promise<string> => { 
    console.log('Uploading to Cloudinary:', file.name); 
    
    const formData = new FormData(); 
    formData.append('file', file); 
    formData.append('upload_preset', 'ml_default'); 
    formData.append('cloud_name', 'deu1ngeov'); 
    formData.append('api_key', '872479185859578'); 

    try { 
      const response = await fetch( 
        `https://api.cloudinary.com/v1_1/deu1ngeov/image/upload`, 
        { 
          method: 'POST', 
          body: formData, 
        } 
      ); 

      if (!response.ok) { 
        throw new Error(`Upload failed with status: ${response.status}`); 
      } 

      const data = await response.json(); 
      console.log('Cloudinary upload successful:', data.secure_url); 
      return data.secure_url; 
    } catch (error) { 
      console.error('Cloudinary upload error:', error); 
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`); 
    } 
  }; 

  const handleLogoUpload = async () => { 
    if (!logoFile) return; 

    setUploading(true); 
    setMessage(""); 
    setError(null); 

    try { 
      const imageUrl = await uploadToCloudinary(logoFile); 
      
      const updatedConfig = { 
        ...appConfig, 
        logoUrl: imageUrl 
      }; 
      
      await set(ref(database, 'appConfig'), updatedConfig); 
      setAppConfig(updatedConfig); 
      setLogoFile(null); 
      setMessage("Logo uploaded successfully to Cloudinary!"); 
    } catch (error) { 
      console.error("Error uploading logo:", error); 
      const errorMessage = error instanceof Error ? error.message : "Error uploading logo. Please try again."; 
      setMessage(errorMessage); 
      setError(errorMessage); 
    } finally { 
      setUploading(false); 
    } 
  }; 

  const handleSliderUpload = async () => { 
    if (sliderFiles.length === 0) return; 

    setUploading(true); 
    setMessage(""); 
    setUploadProgress(0); 
    setError(null); 

    try { 
      const uploadedImages: SliderImage[] = [...(appConfig.sliderImages || [])]; 
      
      for (let i = 0; i < sliderFiles.length; i++) { 
        const file = sliderFiles[i]; 
        const imageUrl = await uploadToCloudinary(file); 
        
        const newImage: SliderImage = { 
          id: `slider-${Date.now()}-${i}`, 
          url: imageUrl, 
          alt: `Slider Image ${uploadedImages.length + i + 1}`, 
          order: uploadedImages.length + i, 
          createdAt: new Date().toISOString() 
        }; 
        
        uploadedImages.push(newImage); 
        
        setUploadProgress(Math.round(((i + 1) / sliderFiles.length) * 100)); 
      } 

      const updatedConfig = { 
        ...appConfig, 
        sliderImages: uploadedImages 
      }; 
      
      await set(ref(database, 'appConfig'), updatedConfig); 
      setAppConfig(updatedConfig); 
      setSliderFiles([]); 
      setUploadProgress(0); 
      setMessage(`${sliderFiles.length} slider images uploaded successfully!`); 
    } catch (error) { 
      console.error("Error uploading slider images:", error); 
      const errorMessage = error instanceof Error ? error.message : "Error uploading slider images. Please try again."; 
      setMessage(errorMessage); 
      setError(errorMessage); 
      setUploadProgress(0); 
    } finally { 
      setUploading(false); 
    } 
  }; 

  const removeSliderImage = async (imageId: string) => { 
    try { 
      const currentImages = appConfig.sliderImages || []; 
      const updatedSliderImages = currentImages.filter(img => img.id !== imageId) 
        .map((img, index) => ({ 
          ...img, 
          order: index 
        })); 
      
      const updatedConfig = { 
        ...appConfig, 
        sliderImages: updatedSliderImages 
      }; 
      
      await set(ref(database, 'appConfig'), updatedConfig); 
      setAppConfig(updatedConfig); 
      setMessage("Slider image removed successfully!"); 
    } catch (error) { 
      console.error("Error removing slider image:", error); 
      const errorMessage = error instanceof Error ? error.message : "Error removing slider image. Please try again."; 
      setMessage(errorMessage); 
      setError(errorMessage); 
    } 
  }; 

  const moveSliderImage = async (imageId: string, direction: 'up' | 'down') => { 
    try { 
      const currentImages = appConfig.sliderImages || []; 
      const currentIndex = currentImages.findIndex(img => img.id === imageId); 
      if (currentIndex === -1) return; 

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1; 
      
      if (newIndex < 0 || newIndex >= currentImages.length) return; 

      const updatedSliderImages = [...currentImages]; 
      const [movedImage] = updatedSliderImages.splice(currentIndex, 1); 
      updatedSliderImages.splice(newIndex, 0, movedImage); 
      
      const reorderedImages = updatedSliderImages.map((img, index) => ({ 
        ...img, 
        order: index 
      })); 

      const updatedConfig = { 
        ...appConfig, 
        sliderImages: reorderedImages 
      }; 
      
      await set(ref(database, 'appConfig'), updatedConfig); 
      setAppConfig(updatedConfig); 
      setMessage(`Slider image moved ${direction} successfully!`); 
    } catch (error) { 
      console.error("Error moving slider image:", error); 
      const errorMessage = error instanceof Error ? error.message : "Error moving slider image. Please try again."; 
      setMessage(errorMessage); 
      setError(errorMessage); 
    } 
  }; 

  const handleAppNameUpdate = async () => { 
    if (!appConfig.appName.trim()) { 
      setMessage("App name cannot be empty!"); 
      return; 
    } 

    try { 
      await set(ref(database, 'appConfig'), appConfig); 
      setMessage("App name updated successfully!"); 
    } catch (error) { 
      console.error("Error updating app name:", error); 
      const errorMessage = error instanceof Error ? error.message : "Error updating app name. Please try again."; 
      setMessage(errorMessage); 
      setError(errorMessage); 
    } 
  }; 

  const handleSupportTutorialUpdate = async () => { 
    try { 
      await set(ref(database, 'appConfig'), appConfig); 
      setMessage("Support & Tutorial settings updated successfully!"); 
    } catch (error) { 
      console.error("Error updating support & tutorial settings:", error); 
      const errorMessage = error instanceof Error ? error.message : "Error updating settings. Please try again."; 
      setMessage(errorMessage); 
      setError(errorMessage); 
    } 
  };

  // 🆕 Added: Handle referral commission update
  const handleReferralCommissionUpdate = async () => {
    const commissionRate = appConfig.referralCommissionRate;
    
    if (commissionRate < 0 || commissionRate > 100) {
      setMessage("Referral commission rate must be between 0 and 100!");
      return;
    }

    try {
      await set(ref(database, 'appConfig'), appConfig);
      setMessage(`Referral commission rate updated to ${commissionRate}% successfully!`);
    } catch (error) {
      console.error("Error updating referral commission:", error);
      const errorMessage = error instanceof Error ? error.message : "Error updating referral commission. Please try again.";
      setMessage(errorMessage);
      setError(errorMessage);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (e.target.files && e.target.files[0]) { 
      const file = e.target.files[0]; 
      
      if (!file.type.startsWith('image/')) { 
        setMessage("Please select a valid image file."); 
        return; 
      } 
      
      if (file.size > 5 * 1024 * 1024) { 
        setMessage("Image size should be less than 5MB."); 
        return; 
      } 
      
      setLogoFile(file); 
      setMessage(""); 
      setError(null); 
    } 
  }; 

  const handleSliderFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (e.target.files && e.target.files.length > 0) { 
      const files = Array.from(e.target.files); 
      
      for (const file of files) { 
        if (!file.type.startsWith('image/')) { 
          setMessage("Please select valid image files only."); 
          return; 
        } 
        
        if (file.size > 5 * 1024 * 1024) { 
          setMessage("Each image should be less than 5MB."); 
          return; 
        } 
      } 
      
      setSliderFiles(files); 
      setMessage(""); 
      setError(null); 
    } 
  }; 

  const handleInputChange = (field: keyof AppConfig, value: string | number) => { 
    setAppConfig(prev => ({ 
      ...prev, 
      [field]: value 
    })); 
  }; 

  const clearAllSliders = async () => { 
    if (!confirm("Are you sure you want to remove all slider images?")) return; 
    
    try { 
      const updatedConfig = { 
        ...appConfig, 
        sliderImages: [] 
      }; 
      
      await set(ref(database, 'appConfig'), updatedConfig); 
      setAppConfig(updatedConfig); 
      setMessage("All slider images removed successfully!"); 
    } catch (error) { 
      console.error("Error clearing slider images:", error); 
      const errorMessage = error instanceof Error ? error.message : "Error clearing slider images. Please try again."; 
      setMessage(errorMessage); 
      setError(errorMessage); 
    } 
  }; 

  // Loading state 
  if (loading) { 
    return ( 
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center"> 
        <div className="text-center"> 
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div> 
          <p>Loading Admin Panel...</p> 
        </div> 
      </div> 
    ); 
  } 

  // Error state 
  if (error) { 
    return ( 
      <div className="min-h-screen bg-gray-900 text-white p-6"> 
        <div className="max-w-4xl mx-auto"> 
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Admin Panel</h1> 
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4"> 
            <p className="text-red-300">{error}</p> 
          </div> 
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded" 
          > 
            Reload Page 
          </button> 
        </div> 
      </div> 
    ); 
  } 

  return ( 
    <div className="min-h-screen bg-gray-900 text-white p-6"> 
      <div className="max-w-6xl mx-auto"> 
        
        {/* Debug Info */}
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6"> 
          <p className="text-yellow-200 text-sm"> 
            DB Connected: {database ? 'Yes' : 'No'}<br /> 
          </p> 
        </div> 

        {/* Logo Upload Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6"> 
          <h2 className="text-xl font-semibold mb-4 text-blue-300">Upload Logo to Cloudinary</h2> 
          
          <div className="mb-4"> 
            <label className="block text-sm font-medium mb-2">Current Logo:</label> 
            {appConfig.logoUrl ? ( 
              <img 
                src={appConfig.logoUrl} 
                alt="Current Logo" 
                className="w-20 h-20 object-cover rounded-full border-2 border-blue-400" 
              /> 
            ) : ( 
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center"> 
                <span className="text-gray-400 text-xs">No logo</span> 
              </div> 
            )} 
          </div> 

          <div className="mb-4"> 
            <label className="block text-sm font-medium mb-2">Select New Logo:</label> 
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-gray-400 
                file:mr-4 file:py-2 file:px-4 
                file:rounded-full file:border-0 
                file:text-sm file:font-semibold 
                file:bg-blue-500 file:text-white 
                hover:file:bg-blue-600 
                bg-gray-700 rounded-lg p-2" 
            /> 
            <p className="text-xs text-gray-400 mt-1"> 
              Supported formats: JPG, PNG, GIF. Max size: 5MB 
            </p> 
          </div> 

          <button 
            onClick={handleLogoUpload} 
            disabled={!logoFile || uploading} 
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-200" 
          > 
            {uploading ? ( 
              <span className="flex items-center"> 
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> 
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> 
                </svg> 
                Uploading... 
              </span> 
            ) : ( 
              'Upload to Cloudinary' 
            )} 
          </button> 
        </div> 

        {/* Slider Images Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6"> 
          <div className="flex justify-between items-center mb-4"> 
            <h2 className="text-xl font-semibold text-blue-300">Slider Images Management</h2> 
            {appConfig.sliderImages && appConfig.sliderImages.length > 0 && ( 
              <button 
                onClick={clearAllSliders} 
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200" 
              > 
                Clear All 
              </button> 
            )} 
          </div> 
          
          <div className="mb-4"> 
            <label className="block text-sm font-medium mb-2"> 
              Current Slider Images ({(appConfig.sliderImages || []).length}): 
            </label> 
            
            {appConfig.sliderImages && appConfig.sliderImages.length > 0 ? ( 
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> 
                {appConfig.sliderImages.sort((a, b) => a.order - b.order).map((image, index) => ( 
                  <div key={image.id} className="relative group bg-gray-700 rounded-lg p-4"> 
                    <div className="flex items-center justify-between mb-2"> 
                      <span className="text-sm text-gray-300">Order: {image.order + 1}</span> 
                      <div className="flex space-x-1"> 
                        <button 
                          onClick={() => moveSliderImage(image.id, 'up')} 
                          disabled={index === 0} 
                          className="p-1 bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed" 
                          title="Move up" 
                        > 
                          <FaArrowUp className="w-3 h-3" /> 
                        </button> 
                        <button 
                          onClick={() => moveSliderImage(image.id, 'down')} 
                          disabled={index === appConfig.sliderImages.length - 1} 
                          className="p-1 bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed" 
                          title="Move down" 
                        > 
                          <FaArrowDown className="w-3 h-3" /> 
                        </button> 
                      </div> 
                    </div> 
                    
                    <img 
                      src={image.url} 
                      alt={image.alt} 
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-600 mb-2" 
                    /> 
                    
                    <div className="flex justify-between items-center"> 
                      <span className="text-xs text-gray-400 truncate flex-1 mr-2"> 
                        {image.alt} 
                      </span> 
                      <button 
                        onClick={() => removeSliderImage(image.id)} 
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition duration-200" 
                        title="Remove image" 
                      > 
                        <FaTrash className="w-3 h-3" /> 
                      </button> 
                    </div> 
                  </div> 
                ))} 
              </div> 
            ) : ( 
              <div className="col-span-3 text-center py-8 border-2 border-dashed border-gray-600 rounded-lg"> 
                <FaImages className="text-4xl text-gray-400 mx-auto mb-2" /> 
                <span className="text-gray-400">No slider images uploaded yet</span> 
              </div> 
            )} 
          </div> 

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && ( 
            <div className="mb-4"> 
              <div className="flex justify-between text-sm mb-1"> 
                <span>Uploading images...</span> 
                <span>{uploadProgress}%</span> 
              </div> 
              <div className="w-full bg-gray-700 rounded-full h-2"> 
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }} 
                ></div> 
              </div> 
            </div> 
          )} 

          <div className="mb-4"> 
            <label className="block text-sm font-medium mb-2">Select New Slider Images:</label> 
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleSliderFilesChange} 
              className="block w-full text-sm text-gray-400 
                file:mr-4 file:py-2 file:px-4 
                file:rounded-full file:border-0 
                file:text-sm file:font-semibold 
                file:bg-green-500 file:text-white 
                hover:file:bg-green-600 
                bg-gray-700 rounded-lg p-2" 
            /> 
            <p className="text-xs text-gray-400 mt-1"> 
              Select multiple images. Supported formats: JPG, PNG, GIF. Max size per image: 5MB 
            </p> 
            {sliderFiles.length > 0 && ( 
              <p className="text-green-400 text-sm mt-2"> 
                {sliderFiles.length} image(s) selected for upload 
              </p> 
            )} 
          </div> 

          <button 
            onClick={handleSliderUpload} 
            disabled={sliderFiles.length === 0 || uploading} 
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-200" 
          > 
            {uploading ? ( 
              <span className="flex items-center"> 
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> 
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> 
                </svg> 
                Uploading... 
              </span> 
            ) : ( 
              `Upload ${sliderFiles.length} Slider Image(s)` 
            )} 
          </button> 
        </div> 

        {/* App Name Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6"> 
          <h2 className="text-xl font-semibold mb-4 text-blue-300">App Configuration</h2> 
          
          <div className="mb-4"> 
            <label className="block text-sm font-medium mb-2">App Name:</label> 
            <input 
              type="text" 
              value={appConfig.appName} 
              onChange={(e) => handleInputChange('appName', e.target.value)} 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="Enter app name" 
            /> 
          </div> 

          <button 
            onClick={handleAppNameUpdate} 
            disabled={!appConfig.appName.trim()} 
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-200" 
          > 
            Update App Name 
          </button> 
        </div>

        {/* 🆕 Referral Commission Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300 flex items-center">
            <FaPercentage className="mr-2" />
            Referral Commission Configuration
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Referral Commission Rate (%):
            </label>
            <div className="relative">
              <input 
                type="number" 
                min="0"
                max="100"
                step="0.1"
                value={appConfig.referralCommissionRate}
                onChange={(e) => handleInputChange('referralCommissionRate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Enter commission percentage"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-400">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Set the referral commission percentage (0-100%). Example: 10 for 10% commission
            </p>
          </div>

          <button 
            onClick={handleReferralCommissionUpdate}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Update Commission Rate
          </button>
        </div>

        {/* Support & Tutorial Configuration Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6"> 
          <h2 className="text-xl font-semibold mb-4 text-blue-300">Support & Tutorial Configuration</h2> 
          
          <div className="mb-4"> 
            <label className="block text-sm font-medium mb-2">Support Telegram URL:</label> 
            <input 
              type="text" 
              value={appConfig.supportUrl || ''} 
              onChange={(e) => handleInputChange('supportUrl', e.target.value)} 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="https://t.me/YourChannelName" 
            /> 
            <p className="text-xs text-gray-400 mt-1"> 
              Enter the full Telegram URL for support 
            </p> 
          </div> 

          <div className="mb-4"> 
            <label className="block text-sm font-medium mb-2">YouTube Tutorial Video ID:</label> 
            <input 
              type="text" 
              value={appConfig.tutorialVideoId || ''} 
              onChange={(e) => handleInputChange('tutorialVideoId', e.target.value)} 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="dQw4w9WgXcQ" 
            /> 
            <p className="text-xs text-gray-400 mt-1"> 
              Enter only the YouTube video ID (the part after "v=" in the URL) 
            </p> 
          </div> 

          <button 
            onClick={handleSupportTutorialUpdate} 
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200" 
          > 
            Update Support & Tutorial 
          </button> 
        </div> 

        {/* Message Display */}
        {message && ( 
          <div className={`p-4 rounded-md mb-4 ${ 
            message.includes('Error') ? 'bg-red-500' : 'bg-green-500' 
          }`}> 
            <div className="flex items-center"> 
              {message.includes('Error') ? ( 
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"> 
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /> 
                </svg> 
              ) : ( 
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"> 
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /> 
                </svg> 
              )} 
              {message} 
            </div> 
          </div> 
        )} 

        {/* Live Preview Section */}
        <div className="bg-gray-800 rounded-lg p-6"> 
          <h2 className="text-xl font-semibold mb-4 text-blue-300">Live Preview</h2> 
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700"> 
            <div className="flex items-center justify-between"> 
              <div className="flex items-center space-x-2"> 
                <div className="rounded-3xl bg-[#0a1a2b] border border-[#014983]/30"> 
                  <img 
                    src={appConfig.logoUrl || "https://res.cloudinary.com/deu1ngeov/image/upload/v1758400527/slide3_lds1l1.jpg"} 
                    alt="logo preview" 
                    className="w-10 h-10 object-cover rounded-full" 
                  /> 
                </div> 
                <p className="text-sm text-blue-400">{appConfig.appName || "PRIME V1"}</p> 
              </div> 
              
              <div className="flex items-center border-2 border-[#014983]/40 rounded-full px-4 py-[2px] bg-[#0a1a2b]"> 
                <div className="h-[32px] w-[2px] bg-[#014983]/40 mx-2"></div> 
                <div className="flex-1 text-center"> 
                  <p className="text-xs text-blue-300 font-medium">Balance</p> 
                  <p className="text-sm text-green-500">USDT 0.00</p> 
                </div> 
              </div> 
            </div> 

            {/* Slider Preview */}
            {appConfig.sliderImages && appConfig.sliderImages.length > 0 && ( 
              <div className="mt-4"> 
                <h3 className="text-sm font-medium mb-2 text-blue-300">Slider Preview:</h3> 
                <div className="grid grid-cols-2 gap-2"> 
                  {appConfig.sliderImages.slice(0, 2).map((image, index) => ( 
                    <img 
                      key={image.id} 
                      src={image.url} 
                      alt={`Slider Preview ${index + 1}`} 
                      className="w-full h-20 object-cover rounded-lg" 
                    /> 
                  ))} 
                </div> 
                {appConfig.sliderImages.length > 2 && ( 
                  <p className="text-xs text-gray-400 mt-1"> 
                    +{appConfig.sliderImages.length - 2} more images 
                  </p> 
                )} 
              </div> 
            )} 

            {/* Support & Tutorial Preview */}
            <div className="mt-4"> 
              <h3 className="text-sm font-medium mb-2 text-blue-300">Support & Tutorial Preview:</h3> 
              <div className="space-y-2"> 
                <div className="flex justify-between items-center text-xs"> 
                  <span className="text-gray-400">Support URL:</span> 
                  <span className="text-blue-300 truncate max-w-[200px]"> 
                    {appConfig.supportUrl || "Not configured"} 
                  </span> 
                </div> 
                <div className="flex justify-between items-center text-xs"> 
                  <span className="text-gray-400">Tutorial Video ID:</span> 
                  <span className="text-blue-300"> 
                    {appConfig.tutorialVideoId || "Not configured"} 
                  </span> 
                </div>
                {/* 🆕 Referral Commission Preview */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Referral Commission:</span>
                  <span className="text-green-300">
                    {appConfig.referralCommissionRate || 0}%
                  </span>
                </div>
              </div> 
            </div> 
          </div> 
        </div> 
      </div> 
    </div> 
  ); 
}; 

export default AdminPanel;
