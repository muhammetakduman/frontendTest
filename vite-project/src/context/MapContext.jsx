// context/MapContext.js
import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import Supercluster from 'supercluster';

// Create the context
const MapContext = createContext();

// Export the custom hook for easier usage
export const useMapContext = () => useContext(MapContext);

// Create the provider component
export const MapProvider = ({ children }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [geojsonData, setGeojsonData] = useState(() => {
    const storedData = localStorage.getItem('parkData');
    return storedData ? JSON.parse(storedData) : { type: 'FeatureCollection', features: [] };
  });
  const [showDetail,setShowDetail] = useState(false)
  const [selectedPark, setSelectedPark] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const istanbul = { lng: 28.9784, lat: 41.0082 }; // Example coordinates for Istanbul
  const zoom = 10;
  maptilersdk.config.apiKey = '63IPOa1Mo2aXc209oImc';

  useEffect(() => {
    if (map.current) return;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [istanbul.lng, istanbul.lat],
      zoom: zoom,
    });

    map.current.on('load', async () => {
      if (geojsonData.features.length === 0) {
        try {
          const response = await fetch('https://api.ibb.gov.tr/ispark/Park');
          const data = await response.json();

          const initialGeojsonData = {
            type: 'FeatureCollection',
            features: data.map((park) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [parseFloat(park.lng), parseFloat(park.lat)],
              },
              properties: { ...park },
            })),
          };

          setGeojsonData(initialGeojsonData);
          localStorage.setItem('parkData', JSON.stringify(initialGeojsonData));
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }

      const index = new Supercluster({
        radius: 40,
        maxZoom: 22,
      });
      index.load(geojsonData.features);
      console.log("Initialized!!")
      map.current.addSource('parks', {
        type: 'geojson',
        data: geojsonData, 
        cluster: true,
        clusterMaxZoom: 22,
        clusterRadius: 50,
      });

      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'parks',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100,
            '#f1f075',
            750,
            '#f28cb1',
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40,
          ],
        },
      });

      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'parks',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 20,
        },
      });

      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'parks',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 15,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
        },
      });

      // Event handler for clicking unclustered points
      map.current.on('click', 'unclustered-point', (e) => {
        const features = e.features[0];
        setSelectedPark(features.properties);
        setShowDetail(true);
        
              // Create a popup with editable fields
        const popup = new maptilersdk.Popup({ offset: 25, closeButton: true, closeOnClick: true })
          .setLngLat(features.geometry.coordinates)
          .setHTML(`
            <div>
              <h3><input type="text" id="edit-parkName" value="${features.properties.parkName}" /></h3>
              <p><strong>Kapasite:</strong> <input type="number" id="edit-capacity" value="${features.properties.capacity}" /></p>
              <p><strong>Boş Kapasite:</strong> <input type="number" id="edit-emptyCapacity" value="${features.properties.emptyCapacity}" /></p>
              <p><strong>Durum:</strong> 
                <select id="edit-isOpen">
                  <option value="true" ${features.properties.isOpen ? 'selected' : ''}>Açık</option>
                  <option value="false" ${!features.properties.isOpen ? 'selected' : ''}>Kapalı</option>
                </select>
              </p>
              <button id="save-changes">Kaydet</button>
            </div>
          `)
          .addTo(map.current);
        

        // Event listener for the "Save" button
        popup.getElement().querySelector('#save-changes').addEventListener('click', () => {
          // Get the updated values from the input fields
          const newParkName = document.getElementById('edit-parkName').value;
          const newCapacity = document.getElementById('edit-capacity').value;
          const newEmptyCapacity = document.getElementById('edit-emptyCapacity').value;
          const newIsOpen = document.getElementById('edit-isOpen').value === 'true';

          // Construct new properties object
          const updatedProperties = {
            ...features.properties,
            parkName: newParkName,
            capacity: parseInt(newCapacity, 10),
            emptyCapacity: parseInt(newEmptyCapacity, 10),
            isOpen: newIsOpen,
          };

          // Call editParkData to update the geojsonData
          editParkData(features.properties.id, updatedProperties);
          setIsEditing(false);
          popup.remove();
        });

        setIsEditing(true);
      });

      map.current.on('click', 'clusters', async (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters'],
        });

        if (!features.length) return;

        const clusterId = features[0].properties.cluster_id;

        try {
          const clusterExpansionZoom = index.getClusterExpansionZoom(clusterId);
          map.current.easeTo({
            center: features[0].geometry.coordinates,
            zoom: clusterExpansionZoom,
          });
        } catch (error) {
          console.error('Cluster expansion error:', error);
        }
      });
    });
  }, [istanbul.lng, istanbul.lat, zoom, geojsonData]);

  const updateGeojsonData = (newData) => {
    setGeojsonData(newData);
    localStorage.setItem('parkData', JSON.stringify(newData));
  };

  const editParkData = (id, newProperties) => {
    const updatedFeatures = geojsonData.features.map((feature) =>
      feature.properties.id === id ? { ...feature, properties: { ...feature.properties, ...newProperties } } : feature
    );
    updateGeojsonData({ ...geojsonData, features: updatedFeatures });
  };

  return (
    <MapContext.Provider value={{ mapContainer, geojsonData, setGeojsonData: updateGeojsonData, selectedPark, setSelectedPark, isEditing, setIsEditing,showDetail,setShowDetail }}>
      {children}
    </MapContext.Provider>
  );
};
