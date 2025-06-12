import { useEffect, useRef, useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  Typography,
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Slider,
  Chip,
  Divider,
  IconButton,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Layers,
  FilterList,
  Visibility,
  VisibilityOff,
  Search,
  Map as MapIcon,
  ViewInAr,
  Tune,
  Info,
  Download,
  Straighten,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import OLCesium from 'olcs';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { jsPDF } from 'jspdf';
import Draw from 'ol/interaction/Draw';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { getArea, getLength } from 'ol/sphere';
import Overlay from 'ol/Overlay';
import GeoJSON from 'ol/format/GeoJSON';

// Configuration globale de Cesium
window.Cesium = Cesium;

const SIDEBAR_WIDTH = 320;

// Définition des fonds cartographiques disponibles
const basemaps = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    source: () => new OSM(),
    visible: true,
    thumbnail: 'https://a.tile.openstreetmap.org/7/63/42.png'
  },
  {
    id: 'esri_world_imagery',
    name: 'ESRI World Imagery',
    source: () => new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attributions: 'Tiles © Esri'
    }),
    visible: false,
    thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/42/63'
  },
  {
    id: 'carto_voyager',
    name: 'Carto Voyager',
    source: () => new XYZ({
      url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      attributions: '© CARTO'
    }),
    visible: false,
    thumbnail: 'https://basemaps.cartocdn.com/rastertiles/voyager/7/63/42.png'
  },
  {
    id: 'carto_positron',
    name: 'Carto Positron (Light)',
    source: () => new XYZ({
      url: 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
      attributions: '© CARTO'
    }),
    visible: false,
    thumbnail: 'https://basemaps.cartocdn.com/rastertiles/light_all/7/63/42.png'
  },
  {
    id: 'carto_dark_matter',
    name: 'Carto Dark Matter',
    source: () => new XYZ({
      url: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
      attributions: '© CARTO'
    }),
    visible: false,
    thumbnail: 'https://basemaps.cartocdn.com/rastertiles/dark_all/7/63/42.png'
  }
];

function CartePage() {
  const mapRef = useRef();
  const [ol3d, setOl3d] = useState(null);
  const [is3D, setIs3D] = useState(false);
  const [tileset, setTileset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [olMap, setOlMap] = useState(null);
  const [measureType, setMeasureType] = useState(null);
  const [measureSource] = useState(new VectorSource());
  const [measureLayer] = useState(new VectorLayer({
    source: measureSource,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: '#ffcc33'
        })
      })
    })
  }));
  const [measureOverlays, setMeasureOverlays] = useState([]);
  const [popupOverlay, setPopupOverlay] = useState(null);
  const popupRef = useRef(null);
  
  // États pour le sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [basemapsOpen, setBasemapsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [opacity, setOpacity] = useState(100);
  const [layerVisible, setLayerVisible] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mapFeatures, setMapFeatures] = useState([]);
  const [filteredFeatures, setFilteredFeatures] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [availableBasemaps, setAvailableBasemaps] = useState(basemaps);
  const [currentBasemap, setCurrentBasemap] = useState(basemaps[0].id);

  // Configuration des couches
  const [layers, setLayers] = useState([
    {
      id: 'ehtp',
      name: 'Bâtiments EHTP',
      visible: true,
      type: 'overlay',
      opacity: 1
    }
  ]);

  // Categories des features
  const categories = [
    { value: 'all', label: 'Tous les éléments' },
    { value: 'building', label: 'Bâtiments' },
    { value: 'facility', label: 'Installations' },
    { value: 'parking', label: 'Parkings' },
    { value: 'garden', label: 'Espaces verts' }
  ];

  // Charger les features depuis GeoServer
  const loadMapFeatures = async () => {
    setLoadingFeatures(true);
    try {
      const response = await fetch('http://localhost:8080/geoserver/Geoportail-EHTP/wms?service=WMS&version=1.1.0&request=GetMap&layers=Geoportail-EHTP%3AEHTP&bbox=-7.653261%2C33.545894%2C-7.647971%2C33.54987273389861&width=768&height=577&srs=EPSG%3A4326&styles=&format=application/json');
      const data = await response.json();
      
      if (data.features) {
        const features = data.features.map((feature, index) => ({
          id: feature.id || `feature_${index}`,
          name: feature.properties?.name || feature.properties?.nom || `Élément ${index + 1}`,
          category: feature.properties?.category || 'building',
          description: feature.properties?.description || 'Aucune description',
          geometry: feature.geometry,
          properties: feature.properties
        }));
        
        setMapFeatures(features);
        setFilteredFeatures(features);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des features:', error);
      setError('Erreur lors du chargement des éléments de la carte');
    } finally {
      setLoadingFeatures(false);
    }
  };

  // Filtrer les features
  useEffect(() => {
    let filtered = mapFeatures;

    // Filtrage par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(feature => feature.category === selectedCategory);
    }

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(feature =>
        feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFeatures(filtered);
  }, [mapFeatures, selectedCategory, searchTerm]);

  // Fonctions utilitaires existantes (modifiées pour supporter tous les fonds cartographiques)
  const exportAsImage = () => {
    if (!olMap) return;
    
    // Créer un canvas temporaire pour combiner toutes les couches
    const mapCanvas = document.createElement('canvas');
    const mapSize = olMap.getSize();
    mapCanvas.width = mapSize[0];
    mapCanvas.height = mapSize[1];
    const mapContext = mapCanvas.getContext('2d');
    
    // Récupérer tous les canvas des couches visibles
    const canvases = document.querySelectorAll('.ol-layer canvas');
    if (!canvases.length) return;
    
    // Dessiner chaque couche sur le canvas temporaire
    Array.from(canvases).forEach(canvas => {
      if (canvas.width > 0) {
        const opacity = canvas.parentNode.style.opacity || 1;
        mapContext.globalAlpha = opacity;
        const transform = canvas.style.transform;
        // Extraire la matrice de transformation
        const matrix = transform.match(/^matrix\(([^\(]*)\)$/)[1].split(',').map(Number);
        // Appliquer la transformation
        mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        mapContext.drawImage(canvas, 0, 0);
      }
    });
    
    // Réinitialiser la transformation
    mapContext.setTransform(1, 0, 0, 1, 0, 0);
    
    // Créer le lien de téléchargement
    const link = document.createElement('a');
    link.download = 'carte-ehtp.png';
    link.href = mapCanvas.toDataURL('image/png');
    link.click();
  };

  const exportAsPDF = () => {
    if (!olMap) return;
    
    // Créer un canvas temporaire pour combiner toutes les couches
    const mapCanvas = document.createElement('canvas');
    const mapSize = olMap.getSize();
    mapCanvas.width = mapSize[0];
    mapCanvas.height = mapSize[1];
    const mapContext = mapCanvas.getContext('2d');
    
    // Récupérer tous les canvas des couches visibles
    const canvases = document.querySelectorAll('.ol-layer canvas');
    if (!canvases.length) return;
    
    // Dessiner chaque couche sur le canvas temporaire
    Array.from(canvases).forEach(canvas => {
      if (canvas.width > 0) {
        const opacity = canvas.parentNode.style.opacity || 1;
        mapContext.globalAlpha = opacity;
        const transform = canvas.style.transform;
        // Extraire la matrice de transformation
        const matrix = transform.match(/^matrix\(([^\(]*)\)$/)[1].split(',').map(Number);
        // Appliquer la transformation
        mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        mapContext.drawImage(canvas, 0, 0);
      }
    });
    
    // Réinitialiser la transformation
    mapContext.setTransform(1, 0, 0, 1, 0, 0);
    
    // Créer le PDF
    const pdf = new jsPDF('landscape');
    const imgData = mapCanvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('carte-ehtp.pdf');
  };

  // Fonction pour centrer la carte sur une feature
  const zoomToFeature = (feature) => {
    if (!olMap || !feature.geometry) return;

    const format = new GeoJSON();
    const olFeature = format.readFeature(feature.geometry, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    const extent = olFeature.getGeometry().getExtent();
    olMap.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 1000
    });
  };

  // Gestion de la visibilité des couches
  const toggleLayerVisibility = (layerId) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        const newVisibility = !layer.visible;
        
        // Mettre à jour la couche sur la carte
        if (olMap) {
          const mapLayer = olMap.getLayers().getArray().find(l => 
            l.get('layerId') === layerId
          );
          if (mapLayer) {
            mapLayer.setVisible(newVisibility);
          }
        }
        
        return { ...layer, visible: newVisibility };
      }
      return layer;
    }));
  };

  // Gestion de l'opacité des couches
  const handleOpacityChange = (layerId, newOpacity) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        // Mettre à jour l'opacité sur la carte
        if (olMap) {
          const mapLayer = olMap.getLayers().getArray().find(l => 
            l.get('layerId') === layerId
          );
          if (mapLayer) {
            mapLayer.setOpacity(newOpacity / 100);
          }
        }
        
        return { ...layer, opacity: newOpacity / 100 };
      }
      return layer;
    }));
  };

  // Fonction pour changer le fond cartographique
  const changeBasemap = (basemapId) => {
    if (!olMap) return;
    
    // Mettre à jour l'état des fonds cartographiques
    setAvailableBasemaps(prev => prev.map(basemap => ({
      ...basemap,
      visible: basemap.id === basemapId
    })));
    
    setCurrentBasemap(basemapId);
    
    // Trouver le fond cartographique sélectionné
    const selectedBasemap = availableBasemaps.find(b => b.id === basemapId);
    if (!selectedBasemap) return;
    
    // Remplacer la couche de base existante
    const baseLayers = olMap.getLayers().getArray().filter(layer => 
      layer.get('isBasemap') === true
    );
    
    // Supprimer les fonds cartographiques existants
    baseLayers.forEach(layer => olMap.removeLayer(layer));
    
    // Ajouter le nouveau fond cartographique
    const newBaseLayer = new TileLayer({
      source: selectedBasemap.source(),
      zIndex: 0
    });
    newBaseLayer.set('isBasemap', true);
    newBaseLayer.set('layerId', selectedBasemap.id);
    
    olMap.getLayers().insertAt(0, newBaseLayer);
  };

  // Fonctions de mesure (conservées et simplifiées)
  const activateMeasure2D = (type) => {
    if (!olMap) return;

    if (type === measureType) {
      clearAllMeasurements();
      setMeasureType(null);
      return;
    }

    clearAllMeasurements();
    setMeasureType(type);
    
    const drawType = type === 'area' ? 'Polygon' : 'LineString';
    const draw = new Draw({
      source: measureSource,
      type: drawType
    });

    olMap.addInteraction(draw);
  };

  const clearAllMeasurements = () => {
    measureSource.clear();
    
    if (olMap) {
      olMap.getInteractions().forEach((interaction) => {
        if (interaction instanceof Draw) {
          olMap.removeInteraction(interaction);
        }
      });
    }

    measureOverlays.forEach(overlay => {
      if (olMap) {
        olMap.removeOverlay(overlay);
      }
    });
    setMeasureOverlays([]);
  };

  // Initialisation de la carte (modifiée pour supporter plusieurs fonds cartographiques)
  useEffect(() => {
    // Créer la couche WMS pour les données EHTP
    const wmsSource = new ImageWMS({
      url: '/geoserver/webSig/wms',
      params: {
        'LAYERS': 'webSig:ehtpshp',
        'FORMAT': 'image/png',
        'TRANSPARENT': true
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous'
    });

    // Trouver le fond cartographique actif
    const activeBasemap = basemaps.find(b => b.id === currentBasemap) || basemaps[0];
    
    // Créer la couche de base
    const baseLayer = new TileLayer({
      source: activeBasemap.source(),
      zIndex: 0
    });
    baseLayer.set('isBasemap', true);
    baseLayer.set('layerId', activeBasemap.id);

    // Créer la couche WMS
    const wmsLayer = new ImageLayer({
      source: wmsSource,
      zIndex: 1
    });
    wmsLayer.set('layerId', 'ehtp');

    // Initialiser la carte
    const ol2d = new Map({
      target: mapRef.current,
      layers: [baseLayer, wmsLayer],
      view: new View({
        center: fromLonLat([-7.650788, 33.547011]),
        zoom: 17,
      }),
    });

    setOlMap(ol2d);

    // Configuration d'OLCesium
    const ol3dInstance = new OLCesium({
      map: ol2d,
      time() {
        return Cesium.JulianDate.now();
      }
    });

    setOl3d(ol3dInstance);
    ol2d.addLayer(measureLayer);

    // Charger les features
    loadMapFeatures();

    // Popup configuration
    const popup = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -10]
    });
    setPopupOverlay(popup);
    ol2d.addOverlay(popup);

    return () => {
      clearAllMeasurements();
      ol2d.setTarget(null);
    };
  }, []);

  const handleToggle = () => {
    if (!ol3d) return;
    const newIs3D = !is3D;
    ol3d.setEnabled(newIs3D);
    setIs3D(newIs3D);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #e0e0e0'
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              Carte EHTP
            </Typography>
            <IconButton onClick={() => setSidebarOpen(false)} size="small">
              <ChevronLeft />
            </IconButton>
          </Box>

          {/* Toggle 2D/3D */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant={!is3D ? "contained" : "outlined"}
              onClick={handleToggle}
              disabled={loading}
              startIcon={<MapIcon />}
              size="small"
              fullWidth
            >
              2D
            </Button>
            <Button
              variant={is3D ? "contained" : "outlined"}
              onClick={handleToggle}
              disabled={loading}
              startIcon={<ViewInAr />}
              size="small"
              fullWidth
            >
              3D
            </Button>
          </Box>

          {/* Boutons d'action */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => activateMeasure2D('length')}
              startIcon={<Straighten />}
              size="small"
              color={measureType === 'length' ? 'primary' : 'inherit'}
            >
              Mesurer
            </Button>
            <Button
              variant="outlined"
              onClick={exportAsImage}
              startIcon={<Download />}
              size="small"
            >
              Export
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        {/* Contenu du sidebar */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* Section Fonds Cartographiques */}
          <Accordion expanded={basemapsOpen} onChange={() => setBasemapsOpen(!basemapsOpen)}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapIcon />
                <Typography variant="subtitle1" fontWeight="medium">Fonds de carte</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {availableBasemaps.map((basemap) => (
                  <Paper 
                    key={basemap.id} 
                    elevation={currentBasemap === basemap.id ? 3 : 1}
                    sx={{
                      p: 1,
                      cursor: 'pointer',
                      border: currentBasemap === basemap.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                    onClick={() => changeBasemap(basemap.id)}
                  >
                    <Typography variant="body2" fontWeight={currentBasemap === basemap.id ? 'bold' : 'normal'}>
                      {basemap.name}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Section Couches */}
          <Accordion expanded={layersOpen} onChange={() => setLayersOpen(!layersOpen)}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Layers />
                <Typography variant="subtitle1" fontWeight="medium">Couches</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {layers.map((layer) => (
                  <ListItem key={layer.id} sx={{ px: 0 }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleLayerVisibility(layer.id)}
                          >
                            {layer.visible ? <Visibility /> : <VisibilityOff />}
                          </IconButton>
                          <Typography variant="body2">{layer.name}</Typography>
                        </Box>
                        <Chip
                          label={layer.type}
                          size="small"
                          variant="outlined"
                          color={layer.type === 'base' ? 'default' : 'primary'}
                        />
                      </Box>
                      {layer.visible && (
                        <Box sx={{ px: 2 }}>
                          <Typography variant="caption" color="textSecondary">
                            Opacité: {Math.round(layer.opacity * 100)}%
                          </Typography>
                          <Slider
                            value={layer.opacity * 100}
                            onChange={(_, value) => handleOpacityChange(layer.id, value)}
                            size="small"
                            min={0}
                            max={100}
                          />
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Section Filtres et Recherche */}
          <Accordion expanded={filtersOpen} onChange={() => setFiltersOpen(!filtersOpen)}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList />
                <Typography variant="subtitle1" fontWeight="medium">Filtres</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Recherche */}
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Rechercher un élément..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />

                {/* Catégories */}
                <FormControl fullWidth size="small">
                  <InputLabel>Catégorie</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Catégorie"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Liste des éléments */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info />
              Éléments de la carte ({filteredFeatures.length})
            </Typography>

            {loadingFeatures ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List dense>
                {filteredFeatures.map((feature) => (
                  <Paper key={feature.id} sx={{ mb: 1, overflow: 'hidden' }}>
                    <ListItemButton
                      onClick={() => zoomToFeature(feature)}
                      sx={{ px: 2, py: 1 }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            {feature.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {feature.description}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </Paper>
                ))}
              </List>
            )}

            {filteredFeatures.length === 0 && !loadingFeatures && (
              <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ py: 2 }}>
                Aucun élément trouvé
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Bouton pour ouvrir le sidebar quand il est fermé */}
      {!sidebarOpen && (
        <IconButton
          onClick={() => setSidebarOpen(true)}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1000,
            backgroundColor: 'white',
            boxShadow: 2,
            '&:hover': {
              backgroundColor: '#f5f5f5'
            }
          }}
        >
          <ChevronRight />
        </IconButton>
      )}

      {/* Contenu principal de la carte */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          marginLeft: sidebarOpen ? 0 : 0,
          transition: 'margin 0.3s ease'
        }}
      >
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%', 
            height: '100%'
          }}
        >
          <div ref={popupRef} className="ol-popup"></div>
        </div>
      </Box>
    </Box>
  );
}

export default CartePage;