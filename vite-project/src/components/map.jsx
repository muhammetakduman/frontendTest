import React, { useRef, useEffect } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import './map.css';
import Supercluster from 'supercluster';

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const istanbul = { lng: 28.979530, lat: 41.015137 }; // TR- İstanbul üzerinde haritanın gelmesini sağlamak.
  const zoom = 14;
  maptilersdk.config.apiKey = '63IPOa1Mo2aXc209oImc';

  useEffect(() => {
    if (map.current) return; // TR- Haritanın birden fazla başlatmasını durdurur.

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [istanbul.lng, istanbul.lat],
      zoom: zoom
    });

    // veri çekme
    fetch('https://api.ibb.gov.tr/ispark/Park')
        .then((response)=> response.json())
        .then((data)=>{
            console.log(data);
            setParkData(data);
            const geojsonData = {
                type: 'FeatureCollection',
                features: data.map((park)=>({
                    type:'Feature',
                    geometry:{
                        type:'Point',
                        coordinates:[park.longitude,park.latitude]
                    },
                    properties : {cluster: false, ...park}
                }))
            };
            const index = new Supercluster({
                radius: 40,
                maxZoom: 16
            });
            index.load(geojsonData.features);

            map.current.addSource('parks',{
                type: 'geojson',
                data: geojsonData,
                cluster: true,
                clusterMaxZoom: 10,
                clusterRadius: 50
            });

            map.current.addLayer({
                id: 'cluster',
                type: 'circle',
                source: 'parks',
                filter: ['has','point_count'],
                paint: {
                    'circle-color': '#f28cb1',
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
                id: 'unclustered-point',
                type: 'circle',
                source: 'parks',
                filter: ['!', ['has','point_count']],
                paint: {
                    'circle-color': '#11b4da',
                    'circle-radius':8,
                    'circle-stroke-width':1,
                    'circle-stroke-color': '#fff'
                }
            });
        });
  }, [istanbul.lng, istanbul.lat, zoom]);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
    </div>
  );
}