// Dark map style for Google Maps — based on "Night" preset from mapstyle.withgoogle.com,
// customized to match the app's dark palette (#0A0E14 base).
// Applied via MapView customMapStyle prop when isDark === true.
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0E14' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0E14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A0AAB8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#F5F7FA' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },  // hide Google's POI clutter, we add our own markers
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#151A21' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#10B981' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1F2630' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F2630' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A323D' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2A323D' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#A0AAB8' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A0E14' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3B82F6' }] },
];
