import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import Supercluster from 'supercluster';

// Context oluşturma
const MapContext = createContext();

// Kullanım için özel hook
export const useMapContext = () => useContext(MapContext);

// Provider bileşeni oluşturma
export const MapProvider = ({ children }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [geojsonData, setGeojsonData] = useState(() => {
    const storedData = localStorage.getItem('parkData');
    return storedData ? JSON.parse(storedData) : { type: 'FeatureCollection', features: [] };
  });
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPark, setSelectedPark] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const istanbul = { lng: 28.9784, lat: 41.0082 }; // İstanbul koordinatları
  const zoom = 10;
  maptilersdk.config.apiKey = '63IPOa1Mo2aXc209oImc';



  useEffect(() => {
    if (map.current) return; // Eğer harita tanımlanmışsa tekrar oluşturma

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
              properties: { ...park }, // API'den gelen doğru alanları kullanın
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
          'circle-color': '#000000',
          'circle-radius': 15,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
        },
      });

      map.current.on('click', 'unclustered-point', (e) => {
        const features = e.features[0];
        setSelectedPark(features.properties);
        setShowDetail(true);
        setIsEditing(false);
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
    console.log(geojsonData)
  }, [istanbul.lng, istanbul.lat, zoom, geojsonData]);

  // GeoJSON verilerini güncelle ve harita kaynağını yenile
  const updateGeojsonData = (newData) => {
    setGeojsonData(newData);
    localStorage.setItem('parkData', JSON.stringify(newData));

    if (map.current && map.current.getSource('parks')) {
      map.current.getSource('parks').setData(newData); // Harita kaynağını güncelle
    }
  };

  // Yalnızca seçili parkı güncellemek için fonksiyon
  const editParkData = (id, newProperties) => {
    const updatedFeatures = geojsonData.features.map((feature) =>
      feature.properties.parkID === id ? { ...feature, properties: { ...feature.properties, ...newProperties } } : feature
    );
    updateGeojsonData({ ...geojsonData, features: updatedFeatures });
  };

  return (
    <MapContext.Provider value={{ 
      mapContainer, 
      geojsonData, 
      setGeojsonData: updateGeojsonData, 
      selectedPark, 
      setSelectedPark, 
      isEditing, 
      setIsEditing, 
      showDetail, 
      setShowDetail,
      editParkData
    }}>
      {children}
    </MapContext.Provider>
  );
};
