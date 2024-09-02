import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import './map.css';
import { useMapContext } from '../context/MapContext';

export default function Map() {
  const { mapContainer, geojsonData, editParkData, selectedPark, setSelectedPark, showDetail, setShowDetail } = useMapContext();
  const [editMode, setEditMode] = useState(false);
  const [capacity, setCapacity] = useState(selectedPark ? selectedPark.capacity : 0);

  // Seçili park değiştiğinde kapasiteyi güncelle
  useEffect(() => {
    if (selectedPark) {
      setCapacity(selectedPark.capacity);
    }
  }, [selectedPark]);

  // Kapasiteyi güncelleme ve kaydetme işlemi
  const handleSave = () => {
    if (isNaN(capacity) || capacity < 0) {
      alert('Geçerli bir kapasite giriniz.');
      return;
    }
    
    const updatedProperties = { ...selectedPark, capacity: parseInt(capacity, 10) };
    editParkData(selectedPark.parkID, updatedProperties);   // Yalnızca seçilen parkı güncelle
    
    setSelectedPark(updatedProperties); // Güncellenmiş parkı state'e kaydet
    setEditMode(false); t
    setShowDetail(false); 
  };

  return (
    <div className='mapContainer'>
      {showDetail && (
        <div className='mapDetailModal'>
          <h2>{selectedPark.parkName}</h2>
          <p>
            Kapasite: {editMode ? (
              <input value={capacity} onChange={e => setCapacity(e.target.value)} type="text" />
            ) : (
              selectedPark.capacity
            )}
          </p>
          <p>Boş Kapasite: {selectedPark.emptyCapacity}</p>
          <p>Durum: {selectedPark.isOpen === 1 ? "Açık" : "Kapalı"}</p>
          {editMode ? (
            <button onClick={handleSave}>Kaydet</button>
          ) : (
            <button className='bg-black' onClick={() => setEditMode(true)}>Düzenle</button>
          )}
          <button onClick={() => setShowDetail(false)}>Kapat</button>
        </div>
      )}
      <div ref={mapContainer} className="map"></div>
    </div>
  );
}