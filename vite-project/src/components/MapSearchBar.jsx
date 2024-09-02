import React, { useState } from 'react';
import { useMapContext } from '../context/MapContext';

export default function MapSearchBar() {
  const { geojsonData, setSelectedPark, setShowDetail } = useMapContext();
  const [searchTerm, setSearchTerm] = useState("");

  // Park adına göre arama yap ve haritayı yakınlaştır
  const handleSearch = () => {
    const park = geojsonData.features.find(feature => 
      feature.properties.parkName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (park) {
      setSelectedPark(park.properties);
      setShowDetail(true);

      // Haritayı parkın bulunduğu yere yakınlaştır
      if (window.mapInstance) {
        window.mapInstance.easeTo({
          center: park.geometry.coordinates,
          zoom: 15, // Yakınlaştırma seviyesi
          duration: 1000
        });
      }
    } else {
      alert("Park adı bulunamadı.");
    }
  };

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 z-10">
      <input 
        type="text" 
        value={searchTerm} 
        onChange={e => setSearchTerm(e.target.value)} 
        placeholder="Park adı ara..." 
        className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button 
        onClick={handleSearch} 
        className="ml-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Ara
      </button>
    </div>
  );
}
