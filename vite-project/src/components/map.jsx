import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import './map.css';
import Supercluster from 'supercluster';

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [parkData, setParkData] = useState([]);
  const [selectedPark, setSelectedPark] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const istanbul = { lng: 28.979530, lat: 41.015137 };
  const zoom = 10;
  maptilersdk.config.apiKey = '63IPOa1Mo2aXc209oImc';

  useEffect(() => {
    if (map.current) return;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [istanbul.lng, istanbul.lat],
      zoom: zoom
    });

    map.current.on('load', async () => {
      try {
        const response = await fetch('https://api.ibb.gov.tr/ispark/Park');
        const data = await response.json();
        setParkData(data);

        const image = await map.current.loadImage('https://play-lh.googleusercontent.com/4atL8glnagLk6Vj_IDqv_TroPmu2Probvv2mezHizfer64J3vy2qRPwsjR8gBBipunY');
        map.current.addImage('isPark', image);

        const geojsonData = {
          type: 'FeatureCollection',
          features: data.map((park) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(park.lng), parseFloat(park.lat)]
            },
            properties: { cluster: false, ...park }
          }))
        };

        const index = new Supercluster({
          radius: 40,
          maxZoom: 22,
          minPoints: 1
        });
        index.load(geojsonData.features);

        map.current.addSource('parks', {
          type: 'geojson',
          data: geojsonData,
          cluster: true,
          clusterMaxZoom: 22,
          clusterRadius: 50
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
              '#f28cb1'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40
            ]
          }
        });

        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'parks',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 20
          }
        });

        map.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'parks',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#11b4da',
            'circle-radius': 8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });

        // İSPARK noktasına tıklama işlevi
        map.current.on('click', 'unclustered-point', (e) => {
          const features = e.features[0];
          setSelectedPark(features.properties);

          // Düzenleme penceresini tetikleme
          new maptilersdk.Popup({ offset: 25, closeButton: true, closeOnClick: true })
            .setLngLat(features.geometry.coordinates)
            .setHTML(`
              <div>
                <h3>${features.properties.parkName}</h3>
                <p><strong>Kapasite:</strong> ${features.properties.capacity}</p>
                <p><strong>Boş Kapasite:</strong> ${features.properties.emptyCapacity}</p>
                <p><strong>Durum:</strong> ${features.properties.isOpen ? 'Açık' : 'Kapalı'}</p>
              </div>
            `)
            .addTo(map.current);

          // Düzenleme butonuna tıklama olayı
          document.getElementById('edit-button').onclick = () => setIsEditing(true);
        });

        // Kümelere tıklama işlevi
        map.current.on('click', 'clusters', async (e) => {
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });

          if (!features.length || !features[0].properties.cluster_id) return;

          const clusterId = features[0].properties.cluster_id;

          try {
            const clusterExpansionZoom = index.getClusterExpansionZoom(clusterId);
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: clusterExpansionZoom
            });
          } catch (error) {
            console.error('Küme genişletme hatası:', error);
          }
        });

      } catch (error) {
        console.error('Veri çekme veya resim yükleme hatası:', error);
      }
    });
  }, [istanbul.lng, istanbul.lat, zoom]);


  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
      {isEditing && selectedPark }
    </div>
  );
}
