"use client";
import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Slider from '@mui/material/Slider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';

// fix default marker icon path issues in many bundlers:
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) { onClick(e.latlng); }
  });
  return null;
}

export default function MapClient() {
  const [marker, setMarker] = useState(null);
  const [center, setCenter] = useState([41.8781, -87.6298]);
  const [map, setMap] = useState(null);
  const [distance, setDistance] = useState(1000);
  const [placeTypes, setPlaceTypes] = useState(["restaurant"]);
  const [priceRange, setPriceRange] = useState([0,4]);
  const [limit, setLimit] = useState(30);
  const [results, setResults] = useState([]);

  const TYPE_OPTIONS = [
    'restaurant',
    'supermarket',
    'transit_station',
    'lodging',
    'book_store',
    'church',
  ];

  const DISPLAY_LABELS = {
    restaurant: '🥘',
    lodging: '🛏️',
    book_store: '📚',
    transit_station: '🚌',
    supermarket: '🛒'
    ,church: '⛪'
  };

  

  const onMapClick = useCallback(async (latlng) => {
    setMarker(latlng);
    const [minprice, maxprice] = Array.isArray(priceRange) ? priceRange : [0, 4];
    const qs = new URLSearchParams({
      lat: latlng.lat,
      lng: latlng.lng,
      radius: String(distance),
      types: placeTypes.join(','),
      minprice: String(minprice),
      maxprice: String(maxprice),
      limit: String(limit)
    }).toString();
    const res = await fetch(`/api/google-places?${qs}`);
    const data = await res.json();
    setResults(data.results || []);
  }, [distance, placeTypes, limit, priceRange]);

  // ask for browser geolocation once and center the map there
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    let mounted = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted) return;
        const c = [pos.coords.latitude, pos.coords.longitude];
        setCenter(c);
        setMarker({ lat: c[0], lng: c[1] });
        if (map) map.setView(c, map.getZoom());
      },
      (err) => {
        // keep default center if user denies or error occurs
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 60_000 }
    );
    return () => { mounted = false; };
  }, [map]);

  // ensure map follows center changes
  useEffect(() => {
    if (map && Array.isArray(center)) {
      try { map.setView(center, map.getZoom()); } catch (e) { /* ignore */ }
    }
  }, [center, map]);

  

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2, flexDirection: { xs: 'column', sm: 'column', md: 'row' }, alignItems: 'stretch' }}>
      <Paper sx={{ order: { xs: 1, md: 1 }, width: { xs: '100%', md: 480 }, minWidth: 0, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} elevation={3}>
        <Typography variant="h6">EasyMap</Typography>
        

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
          <FormControl size="small" sx={{ flex: '0 0 30%', minWidth: 0 }}>
            <InputLabel id="place-types-label">Places</InputLabel>
            <Select
              labelId="place-types-label"
              multiple
              value={placeTypes}
              onChange={e => setPlaceTypes(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              label="Places"
              renderValue={(selected) => selected.map(s => DISPLAY_LABELS[s] || s).join(', ')}
            >
              {TYPE_OPTIONS.map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={placeTypes.indexOf(type) > -1} />
                  <ListItemText primary={DISPLAY_LABELS[type] || type} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Distance (m)"
            type="number"
            value={distance}
            onChange={e => setDistance(Number(e.target.value))}
            inputProps={{ step: 500, min: 0 }}
            size="small"
            sx={{ flex: '0 0 70%', minWidth: 0 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
          <TextField
            label="Max Results"
            type="number"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            inputProps={{ step: 5, min: 0}}
            size="small"
            sx={{ flex: '0 0 30%', minWidth: 0 }}
          />

          <Box sx={{ flex: '0 0 70%', minWidth: 0, px: 3 }}>
            <Typography gutterBottom variant="body2">Price Range</Typography>
            <Slider
              value={priceRange}
              onChange={(e, newValue) => setPriceRange(Array.isArray(newValue) ? newValue : [0, newValue])}
              valueLabelDisplay="auto"
              min={0}
              max={4}
            />
          </Box>
        </Stack>

        <Divider />

        <Typography variant="subtitle1">Results ({results.length})</Typography>
        <Paper variant="outlined" sx={{ maxHeight: 320, overflow: 'auto' }}>
          <List dense>
            {results.map(r => (
              <ListItem key={r.place_id || r.id} divider alignItems="flex-start">
                <ListItemText
                  primary={r.name}
                  secondary={
                    <Stack spacing={0.5}>
                      <span>{r.vicinity || r.location?.address}</span>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Rating name={`rating-${r.place_id || r.id}`} value={r.rating || 0} precision={0.1} readOnly size="small" />
                        <Chip label={`${r.rating ? r.rating.toFixed(1) : '—'} (${r.user_ratings_total || 0} reviews)`} size="small" variant="outlined" />
                        <Chip
                          label={
                            typeof r.price_level === 'number'
                              ? (r.price_level === 0 ? 'Free' : '$'.repeat(Math.max(0, r.price_level)))
                              : '—'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Paper>

      <Box sx={{ order: { xs: 2, md: 2 }, width: '100%', minWidth: 0 }}>
          <div style={{ height: '360px', width: '100%', maxWidth: '100%' }}>
          <MapContainer center={center} zoom={11} whenCreated={m => setMap(m)} style={{height:'100%', width:'100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ClickHandler onClick={onMapClick} />
            {marker && <Marker position={[marker.lat, marker.lng]}>
              <Popup>{marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}</Popup>
            </Marker>}
          </MapContainer>
        </div>
      </Box>
    </Box>
  );
}
