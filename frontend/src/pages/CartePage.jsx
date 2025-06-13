import { useEffect, useRef, useState } from 'react';
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
import * as olEasing from 'ol/easing';
import { 
  Box, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Typography,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Chip,
  Paper,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ViewInAr as View3DIcon,
  ViewModule as View2DIcon,
  Straighten as MeasureIcon,
  FileDownload as ExportIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Layers,
  FilterList,
  Visibility,
  VisibilityOff,
  Search,
  Map as MapIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  ExpandMore
} from '@mui/icons-material';

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [measureType, setMeasureType] = useState(null);
  const [showMeasureMenu, setShowMeasureMenu] = useState(false);
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
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [highlightLayer, setHighlightLayer] = useState(null);
  const [hoverOverlay, setHoverOverlay] = useState(null);
  const hoverRef = useRef(null);
  const theme = useTheme();
  const [measureAnchorEl, setMeasureAnchorEl] = useState(null);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
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
  const [wmsSource, setWmsSource] = useState(null);

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

  // Style de surbrillance amélioré
  const highlightStyle = new Style({
    fill: new Fill({
      color: 'rgba(0, 123, 255, 0.3)'  // Bleu semi-transparent
    }),
    stroke: new Stroke({
      color: '#007bff',  // Bleu plus foncé pour le contour
      width: 3
    })
  });

  // Style de surbrillance pour le hover
  const hoverStyle = new Style({
    fill: new Fill({
      color: 'rgba(0, 153, 255, 0.4)'  // Bleu plus vif et plus opaque
    }),
    stroke: new Stroke({
      color: '#0099ff',  // Bleu vif
      width: 3,          // Bordure plus épaisse
      lineDash: null     // Ligne continue
    }),
    zIndex: 2           // S'assurer que c'est au-dessus des autres couches
  });

  // Fonction pour exporter la carte en image
  const exportAsImage = () => {
    if (!olMap) return;
    
    const canvas = document.querySelector('.ol-layer canvas');
    if (!canvas) return;

    // Créer un lien temporaire pour le téléchargement
    const link = document.createElement('a');
    link.download = 'carte-ehtp.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    setShowExportMenu(false);
  };

  // Fonction pour exporter la carte en PDF
  const exportAsPDF = () => {
    if (!olMap) return;
    
    const canvas = document.querySelector('.ol-layer canvas');
    if (!canvas) return;

    const pdf = new jsPDF('landscape');
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('carte-ehtp.pdf');
    setShowExportMenu(false);
  };

  // Fonction pour exporter la couche en GeoJSON
  const exportAsGeoJSON = async () => {
    try {
      const response = await fetch('/geoserver/webSig/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=webSig:ehtpshp&outputFormat=application/json');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ehtp.geojson';
      link.click();
      window.URL.revokeObjectURL(url);
      setShowExportMenu(false);
    } catch (error) {
      setError('Erreur lors de l\'export en GeoJSON');
      console.error('Erreur GeoJSON:', error);
    }
  };

  // Fonction pour exporter la couche en Shapefile
  const exportAsShapefile = async () => {
    try {
      const response = await fetch('/geoserver/webSig/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=webSig:ehtpshp&outputFormat=SHAPE-ZIP');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ehtp.zip';
      link.click();
      window.URL.revokeObjectURL(url);
      setShowExportMenu(false);
    } catch (error) {
      setError('Erreur lors de l\'export en Shapefile');
      console.error('Erreur Shapefile:', error);
    }
  };

  // Fonction pour formater la mesure
  const formatMeasurement = (measurement, type) => {
    if (type === 'area') {
      return `${Math.round(measurement)} m²`;
    } else if (type === 'length') {
      return `${Math.round(measurement * 100) / 100} m`;
    }
    return '';
  };

  // Fonction pour nettoyer toutes les mesures 2D
  const clearAllMeasurements = () => {
    // Nettoyer la source
    measureSource.clear();
    
    // Supprimer toutes les interactions de mesure
    if (olMap) {
      olMap.getInteractions().forEach((interaction) => {
        if (interaction instanceof Draw) {
          olMap.removeInteraction(interaction);
        }
      });
    }

    // Supprimer tous les overlays de mesure
    measureOverlays.forEach(overlay => {
      if (olMap) {
        olMap.removeOverlay(overlay);
      }
    });
    setMeasureOverlays([]);
  };

  // Fonction pour activer la mesure 2D
  const activateMeasure2D = (type) => {
    if (!olMap) return;

    // Si on clique sur le même type de mesure, on désactive
    if (type === measureType) {
      clearAllMeasurements();
      setMeasureType(null);
      return;
    }

    // Nettoyer les mesures précédentes
    clearAllMeasurements();
    setMeasureType(type);
    
    const drawType = type === 'area' ? 'Polygon' : 'LineString';
    const draw = new Draw({
      source: measureSource,
      type: drawType,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)'
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          })
        })
      })
    });

    olMap.addInteraction(draw);

    let measureTooltipElement;
    let measureTooltip;

    const createMeasureTooltip = () => {
      if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
      }
      measureTooltipElement = document.createElement('div');
      measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
      measureTooltip = new Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center',
        stopEvent: false,
        insertFirst: false
      });
      olMap.addOverlay(measureTooltip);
      setMeasureOverlays(prev => [...prev, measureTooltip]);
    };

    createMeasureTooltip();

    let sketch;
    draw.on('drawstart', (evt) => {
      sketch = evt.feature;
      let tooltipCoord = evt.coordinate;

      sketch.getGeometry().on('change', (evt) => {
        const geom = evt.target;
        let measurement;
        if (type === 'area') {
          measurement = getArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else {
          measurement = getLength(geom);
          tooltipCoord = geom.getLastCoordinate();
        }
        measureTooltipElement.innerHTML = formatMeasurement(measurement, type);
        measureTooltip.setPosition(tooltipCoord);
      });
    });

    draw.on('drawend', () => {
      measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
      measureTooltip.setOffset([0, -7]);
      sketch = null;
      measureTooltipElement = null;
      createMeasureTooltip();
    });
  };

  // Fonction pour activer la mesure 3D
  const activateMeasure3D = (type) => {
    if (!ol3d) return;
    
    const scene = ol3d.getCesiumScene();
    if (!scene) return;

    // Désactiver les mesures précédentes
    if (scene.activeHandler) {
      scene.activeHandler.destroy();
      scene.activeHandler = undefined;
    }

    // Nettoyer les entités de mesure existantes
    scene.entities.removeAll();

    if (type === measureType) {
      setMeasureType(null);
      return;
    }

    setMeasureType(type);

    // Créer un gestionnaire d'événements pour la mesure
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    scene.activeHandler = handler;

    if (type === 'distance3D') {
      let positions = [];
      let polyline;
      let label;

      handler.setInputAction((click) => {
        const cartesian = scene.camera.pickEllipsoid(
          click.position,
          scene.globe.ellipsoid
        );

        if (cartesian) {
          positions.push(cartesian);

          if (positions.length === 1) {
            polyline = scene.entities.add({
              polyline: {
                positions: positions,
                width: 2,
                material: Cesium.Color.YELLOW
              }
            });
          } else if (positions.length === 2) {
            const distance = Cesium.Cartesian3.distance(positions[0], positions[1]);
            const midpoint = Cesium.Cartesian3.midpoint(
              positions[0],
              positions[1],
              new Cesium.Cartesian3()
            );

            label = scene.entities.add({
              position: midpoint,
              label: {
                text: `${Math.round(distance)} m`,
                font: '14px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM
              }
            });

            handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    // Ajouter un gestionnaire de clic droit pour annuler la mesure
    handler.setInputAction(() => {
      scene.entities.removeAll();
      handler.destroy();
      scene.activeHandler = undefined;
      setMeasureType(null);
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  };

  // Fonction pour formater le nom de fichier
  const formatImageFileName = (name) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')     // Remplace les espaces par des tirets
      .replace(/[^a-z0-9-]/g, '') // Enlève les caractères spéciaux
      .trim();
  };

  // Fonction pour vérifier si une image existe
  const getImageUrl = (name) => {
    const baseImagePath = '/images/entities/';
    const formattedName = formatImageFileName(name);
    
    // Liste des extensions d'image à essayer
    const extensions = ['jpg', 'jpeg', 'png'];
    
    // On retourne le chemin de l'image avec la première extension trouvée
    for (const ext of extensions) {
      const imagePath = `${baseImagePath}${formattedName}.${ext}`;
      try {
        // On vérifie si l'image existe en essayant de la charger
        const img = new Image();
        img.src = imagePath;
        return imagePath;
      } catch (error) {
        console.log(`Image non trouvée avec l'extension ${ext}`);
        continue;
      }
    }
    
    // Image par défaut si aucune image correspondante n'est trouvée
    return '/images/entities/default.jpg';
  };

  // Fonction pour changer le fond cartographique
  const changeBasemap = (basemapId) => {
    if (!olMap) return;
    setAvailableBasemaps(prev => prev.map(basemap => ({
      ...basemap,
      visible: basemap.id === basemapId
    })));
    setCurrentBasemap(basemapId);
    const selectedBasemap = availableBasemaps.find(b => b.id === basemapId);
    if (!selectedBasemap) return;
    const baseLayers = olMap.getLayers().getArray().filter(layer => layer.get('isBasemap') === true);
    baseLayers.forEach(layer => olMap.removeLayer(layer));
    const newBaseLayer = new TileLayer({
      source: selectedBasemap.source(),
      zIndex: 0
    });
    newBaseLayer.set('isBasemap', true);
    newBaseLayer.set('layerId', selectedBasemap.id);
    olMap.getLayers().insertAt(0, newBaseLayer);
  };

  // Fonction pour charger les features depuis GeoServer
  const loadMapFeatures = async () => {
    setLoadingFeatures(true);
    try {
      const response = await fetch('/geoserver/webSig/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=webSig:ehtpshp&outputFormat=application/json');
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

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(feature => feature.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(feature =>
        feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFeatures(filtered);
  }, [mapFeatures, selectedCategory, searchTerm]);

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

  useEffect(() => {
    // Configuration de la source WMS principale
    const newWmsSource = new ImageWMS({
      url: '/geoserver/webSig/wms',
      params: {
        'LAYERS': 'webSig:ehtpshp',
        'FORMAT': 'image/png',
        'TRANSPARENT': true
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous'
    });

    setWmsSource(newWmsSource);

    // Fonction pour réinitialiser les filtres
    const resetFilters = () => {
      if (newWmsSource) {
        newWmsSource.updateParams({
          'CQL_FILTER': null
        });
        newWmsSource.refresh();
      }
    };

    // Fonction pour filtrer les features
    const filterFeatures = async (filterType) => {
      try {
        // Réinitialiser d'abord le filtre précédent
        resetFilters();

        // Si c'est 'all', on s'arrête là
        if (filterType === 'all') {
          return;
        }

        // Requête WFS pour obtenir les features
        const response = await fetch('/geoserver/webSig/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=webSig:ehtpshp&outputFormat=application/json');
        const data = await response.json();
        
        if (data.features) {
          // Filtrer les features selon le type
          const filteredFeatures = data.features.filter(feature => {
            const name = feature.properties.name || feature.properties.nom || '';
            switch(filterType) {
              case 'building':
                return name.toLowerCase().includes('batiment') || name.toLowerCase().includes('bâtiment');
              case 'department':
                return name.toLowerCase().includes('departement') || name.toLowerCase().includes('département');
              case 'parking':
                return name.toLowerCase().includes('parking') || name.toLowerCase().includes('stationnement');
              case 'terrain':
                return name.toLowerCase().includes('terrain') || name.toLowerCase().includes('stade');
              case 'room':
                return name.toLowerCase().includes('salle') || 
                       name.toLowerCase().includes('amphitheatre') || 
                       name.toLowerCase().includes('amphithéâtre') ||
                       name.toLowerCase().includes('laboratoire') ||
                       name.toLowerCase().includes('labo');
              default:
                return true;
            }
          });

          // Construire le filtre CQL avec les IDs des features filtrées
          if (filteredFeatures.length > 0) {
            const featureIds = filteredFeatures.map(f => f.id);
            newWmsSource.updateParams({
              'CQL_FILTER': `id IN ('${featureIds.join("','")}')`
            });
          } else {
            newWmsSource.updateParams({
              'CQL_FILTER': 'FALSE'
            });
          }
          newWmsSource.refresh();
        }
      } catch (error) {
        console.error('Erreur lors du filtrage:', error);
        setError('Erreur lors du filtrage des éléments');
      }
    };

    // Mettre à jour les fonctions dans le composant
    window.filterFeatures = filterFeatures;
    window.resetFilters = resetFilters;

    // Configuration de la source WMS pour le hover
    const hoverWmsSource = new ImageWMS({
      url: '/geoserver/webSig/wms',
      params: {
        'LAYERS': 'webSig:ehtpshp',
        'FORMAT': 'image/png',
        'TRANSPARENT': true,
        'STYLES': 'highlight',  // Style de surbrillance défini dans GeoServer
        'CQL_FILTER': 'FALSE'   // Par défaut, ne montre rien
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous'
    });

    // Couche de fond basée sur le basemap actuel
    const selectedBasemap = availableBasemaps.find(b => b.id === currentBasemap) || availableBasemaps[0];
    const baseLayer = new TileLayer({
      source: selectedBasemap.source(),
      zIndex: 0
    });
    baseLayer.set('isBasemap', true);
    baseLayer.set('layerId', selectedBasemap.id);

    // Couche WMS principale
    const wmsLayer = new ImageLayer({
      source: newWmsSource,
      zIndex: 1
    });

    // Couche WMS pour le hover
    const hoverLayer = new ImageLayer({
      source: hoverWmsSource,
      zIndex: 2
    });

    // Création de la carte 2D
    const ol2d = new Map({
      target: mapRef.current,
      layers: [baseLayer, wmsLayer, hoverLayer],
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

    // Configuration de la scène Cesium
    const scene = ol3dInstance.getCesiumScene();
    if (scene) {
      // Configuration optionnelle de la scène 3D
      scene.globe.enableLighting = true;
      
      // Fonction pour charger le tileset 3D
      const loadTileset = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // URLs à tester dans l'ordre de priorité
          const tilesetUrls = [
            'public/3D/tileset.json', // Votre tileset local
             
          ];

          let tileset3D = null;
          let urlUsed = null;

          // Essayer chaque URL jusqu'à ce qu'une fonctionne
          for (const url of tilesetUrls) {
            try {
              console.log(`Tentative de chargement du tileset depuis: ${url}`);
              
              tileset3D = await Cesium.Cesium3DTileset.fromUrl(url, {
                maximumScreenSpaceError: 16,
                maximumNumberOfLoadedTiles: 1000,
                skipLevelOfDetail: true,
                baseScreenSpaceError: 1024,
                skipScreenSpaceErrorFactor: 16,
                skipLevels: 1,
                immediatelyLoadDesiredLevelOfDetail: false,
                loadSiblings: false,
                cullWithChildrenBounds: true
              });

              if (tileset3D) {
                urlUsed = url;
                console.log(`Tileset chargé avec succès depuis: ${url}`);
                break;
              }
            } catch (urlError) {
              console.warn(`Impossible de charger le tileset depuis ${url}:`, urlError);
              continue;
            }
          }

          if (!tileset3D) {
            throw new Error('Aucun tileset 3D n\'a pu être chargé depuis les URLs disponibles');
          }

          // Ajouter le tileset à la scène
          scene.primitives.add(tileset3D);
          
          // Attendre que le tileset soit prêt
          await tileset3D.readyPromise;
          
          console.log('Tileset 3D prêt et ajouté à la scène');
          
          // Centrer la vue sur le tileset
          if (tileset3D.boundingSphere) {
            scene.camera.viewBoundingSphere(
              tileset3D.boundingSphere, 
              new Cesium.HeadingPitchRange(0, -0.5, 0)
            );
          }
          
          setTileset(tileset3D);
          
        } catch (error) {
          console.error('Erreur lors du chargement du tileset 3D:', error);
          setError(`Erreur de chargement: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };

      // Charger le tileset de manière asynchrone
      loadTileset();
    }

    setOl3d(ol3dInstance);

    // Ajouter la couche de mesure
    ol2d.addLayer(measureLayer);

    // Création de la popup
    const popup = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -10]
    });
    setPopupOverlay(popup);
    ol2d.addOverlay(popup);

    // Création de la couche de surbrillance avec le nouveau style
    const highlight = new VectorLayer({
      source: new VectorSource(),
      style: highlightStyle,
      zIndex: 1
    });
    setHighlightLayer(highlight);
    ol2d.addLayer(highlight);

    // Variable pour stocker l'ID de la feature actuellement survolée
    let currentHoverFeatureId = null;

    // Gestionnaire de survol
    ol2d.on('pointermove', async (evt) => {
      if (is3D) return;

      const coordinate = evt.coordinate;
      
      // Créer une petite zone autour du point de survol
      const buffer = 5;
      const bbox = [
        coordinate[0] - buffer,
        coordinate[1] - buffer,
        coordinate[0] + buffer,
        coordinate[1] + buffer
      ].join(',');

      // Construire l'URL WFS
      const wfsUrl = '/geoserver/webSig/ows?' +
        'service=WFS&' +
        'version=1.0.0&' +
        'request=GetFeature&' +
        'typeName=webSig:ehtpshp&' +
        'outputFormat=application/json&' +
        'srsName=EPSG:3857&' +
        `bbox=${bbox},EPSG:3857`;

      try {
        const response = await fetch(wfsUrl);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const featureId = feature.id || feature.properties?.id;
          
          if (currentHoverFeatureId === featureId) {
            return;
          }
          
          currentHoverFeatureId = featureId;
          ol2d.getViewport().style.cursor = 'pointer';

          // Mettre à jour le filtre de la couche de hover
          if (featureId) {
            hoverWmsSource.updateParams({
              'CQL_FILTER': `id = '${featureId}'`
            });
          }

          // Afficher le popup
          if (feature.properties) {
            const name = feature.properties.name || feature.properties.nom || 
                        feature.properties.NAME || feature.id || 'Sans nom';
            
            const imageUrl = getImageUrl(name);
            
            const popupContent = `
              <div class="popup-content">
                <div class="popup-header">
                  <h3>${name}</h3>
                </div>
                <div class="popup-image">
                  <img src="${imageUrl}" 
                       alt="${name}"
                       onerror="this.src='/images/entities/default.jpg';" />
                </div>
                <div class="popup-info">
                  ${feature.properties.description || ''}
                </div>
              </div>
            `;

            if (popupRef.current) {
              popupRef.current.innerHTML = popupContent;
              popup.setPosition(coordinate);
            }
          }
        } else {
          currentHoverFeatureId = null;
          ol2d.getViewport().style.cursor = '';
          popup.setPosition(undefined);
          // Réinitialiser le filtre de la couche de hover
          hoverWmsSource.updateParams({
            'CQL_FILTER': 'FALSE'
          });
        }
      } catch (error) {
        currentHoverFeatureId = null;
        console.error('Erreur lors de la requête WFS pour le hover:', error);
        popup.setPosition(undefined);
        // Réinitialiser le filtre de la couche de hover
        hoverWmsSource.updateParams({
          'CQL_FILTER': 'FALSE'
        });
      }
    });

    // Gestionnaire pour effacer le hover quand la souris quitte la carte
    ol2d.getViewport().addEventListener('mouseout', () => {
      currentHoverFeatureId = null;
      ol2d.getViewport().style.cursor = '';
      popup.setPosition(undefined);
      // Réinitialiser le filtre de la couche de hover
      hoverWmsSource.updateParams({
        'CQL_FILTER': 'FALSE'
      });
    });

    // Mettre à jour les styles CSS
    const style = document.createElement('style');
    style.textContent = `
      .ol-popup {
        position: absolute;
        background-color: white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        padding: 0;
        border-radius: 6px;
        border: none;
        min-width: 280px;
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 1000;
        transition: opacity 0.2s ease-in-out;
        animation: popupFadeIn 0.2s ease-out;
      }

      .popup-content {
        overflow: hidden;
        max-height: calc(80vh - 40px);
      }

      .popup-header {
        background-color: #2c3e50;
        color: white;
        padding: 15px;
        border-radius: 6px 6px 0 0;
      }

      .popup-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
        color: white;
      }

      .popup-image {
        width: 100%;
        height: 200px;
        overflow: hidden;
        position: relative;
        border-bottom: 1px solid #eee;
      }

      .popup-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .popup-info {
        padding: 15px;
        font-size: 14px;
        color: #333;
        line-height: 1.5;
      }

      /* Style de la barre de défilement */
      .ol-popup::-webkit-scrollbar {
        width: 8px;
      }

      .ol-popup::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      .ol-popup::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }

      .ol-popup::-webkit-scrollbar-thumb:hover {
        background: #555;
      }

      /* Animation d'apparition du popup */
      .ol-popup {
        animation: popupFadeIn 0.3s ease-out;
      }

      @keyframes popupFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .hover-popup {
        background-color: rgba(0, 0, 0, 0.8);
        border-radius: 4px;
        color: white;
        padding: 8px 12px;
        font-size: 14px;
        pointer-events: none;
        white-space: nowrap;
        transform: translateY(-5px);
        animation: hoverFadeIn 0.2s ease-out;
      }

      .hover-content {
        margin: 0;
      }

      .hover-content span {
        font-weight: 500;
      }

      @keyframes hoverFadeIn {
        from {
          opacity: 0;
          transform: translateY(0);
        }
        to {
          opacity: 1;
          transform: translateY(-5px);
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      clearAllMeasurements();
      if (ol3d) {
        const scene = ol3d.getCesiumScene();
        if (scene && scene.activeHandler) {
          scene.activeHandler.destroy();
          scene.entities.removeAll();
        }
      }
      if (tileset && scene) {
        scene.primitives.remove(tileset);
      }
      ol2d.setTarget(null);
      if (popup) {
        ol2d.removeOverlay(popup);
      }
      if (highlight) {
        ol2d.removeLayer(highlight);
      }
      if (hoverLayer) {
        ol2d.removeLayer(hoverLayer);
      }
      currentHoverFeatureId = null;
    };
  }, []);

  // Toggle entre 2D et 3D avec animation
  const handleToggle = () => {
    if (!ol3d) return;
  
    // Référence à l'élément DOM de la carte
    const mapElement = mapRef.current;
    
    // Ajouter une classe pour l'animation de transition
    if (mapElement) {
      mapElement.classList.add('map-transition');
      
      // Animation de zoom-out avant la transition
      if (!is3D && olMap) {
        olMap.getView().animate({
          zoom: olMap.getView().getZoom() - 1.5,
          duration: 600,
          easing: olEasing.easeOut
        });
      }
    }
  
    // Délai pour permettre à l'animation de commencer avant le changement de mode
    setTimeout(() => {
      const newIs3D = !is3D;
      ol3d.setEnabled(newIs3D);
      
      if (newIs3D && tileset) {
        const scene = ol3d.getCesiumScene();
        if (scene && tileset.boundingSphere) {
          // Animation plus fluide en 3D avec une durée plus longue
          setTimeout(() => {
            scene.camera.flyToBoundingSphere(
              tileset.boundingSphere, {
                duration: 1.5,
                offset: new Cesium.HeadingPitchRange(0, -0.5, 100),
                complete: () => {
                  // Animation supplémentaire pour améliorer l'expérience
                  scene.camera.flyTo({
                    destination: scene.camera.position,
                    orientation: {
                      heading: Cesium.Math.toRadians(15),
                      pitch: scene.camera.pitch,
                      roll: 0
                    },
                    duration: 1.2
                  });
                }
              }
            );
          }, 100);
        }
      } else if (!newIs3D && olMap) {
        // Animation plus fluide en 2D
        olMap.getView().animate({
          center: fromLonLat([-7.650788, 33.547011]),
          zoom: 17,
          duration: 800,
          easing: olEasing.easeInOut
        });
      }
      
      setIs3D(newIs3D);
      
      // Retirer la classe d'animation après la transition
      setTimeout(() => {
        if (mapElement) {
          mapElement.classList.remove('map-transition');
        }
      }, 1000);
    }, 300);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
        sx={{
          width: SIDEBAR_WIDTH,
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
              startIcon={<View2DIcon />}
              size="small"
              fullWidth
            >
              2D
            </Button>
            <Button
              variant={is3D ? "contained" : "outlined"}
              onClick={handleToggle}
              disabled={loading}
              startIcon={<View3DIcon />}
              size="small"
              fullWidth
            >
              3D
            </Button>
          </Box>

          {/* Boutons d'action regroupés en menus */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              onClick={e => setMeasureAnchorEl(e.currentTarget)}
              startIcon={<MeasureIcon />}
              size="small"
              color={measureType ? 'primary' : 'inherit'}
              endIcon={<ArrowDropDownIcon />}
            >
              Mesurer
            </Button>
            <Menu
              anchorEl={measureAnchorEl}
              open={Boolean(measureAnchorEl)}
              onClose={() => setMeasureAnchorEl(null)}
            >
              <MenuItem onClick={() => { activateMeasure2D('length'); setMeasureAnchorEl(null); }} selected={measureType === 'length'}>
                Mesurer une distance
              </MenuItem>
              <MenuItem onClick={() => { activateMeasure2D('area'); setMeasureAnchorEl(null); }} selected={measureType === 'area'}>
                Mesurer une surface
              </MenuItem>
            </Menu>
            <Button
              variant="outlined"
              onClick={e => setExportAnchorEl(e.currentTarget)}
              startIcon={<ExportIcon />}
              size="small"
              endIcon={<ArrowDropDownIcon />}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={() => setExportAnchorEl(null)}
            >
              <MenuItem onClick={() => { exportAsImage(); setExportAnchorEl(null); }}>
                Exporter en PNG
              </MenuItem>
              <MenuItem onClick={() => { exportAsPDF(); setExportAnchorEl(null); }}>
                Exporter en PDF
              </MenuItem>
              <MenuItem onClick={() => { exportAsGeoJSON(); setExportAnchorEl(null); }}>
                Exporter en GeoJSON
              </MenuItem>
              <MenuItem onClick={() => { exportAsShapefile(); setExportAnchorEl(null); }}>
                Exporter en Shapefile
              </MenuItem>
            </Menu>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        {/* Section Fonds de carte */}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <img src={basemap.thumbnail} alt={basemap.name} width={32} height={32} style={{ borderRadius: 4 }} />
                    <Typography variant="body2" fontWeight={currentBasemap === basemap.id ? 'bold' : 'normal'}>
                      {basemap.name}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Contenu du sidebar */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
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
                <Typography variant="subtitle2" gutterBottom>
                  Filtrer par type
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant={selectedCategory === 'all' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedCategory('all');
                      window.resetFilters();
                    }}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Tous les éléments
                  </Button>
                  <Button
                    variant={selectedCategory === 'building' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedCategory('building');
                      window.filterFeatures('building');
                    }}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Bâtiments
                  </Button>
                  <Button
                    variant={selectedCategory === 'department' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedCategory('department');
                      window.filterFeatures('department');
                    }}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Départements
                  </Button>
                  <Button
                    variant={selectedCategory === 'room' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedCategory('room');
                      window.filterFeatures('room');
                    }}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Salles
                  </Button>
                  <Button
                    variant={selectedCategory === 'parking' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedCategory('parking');
                      window.filterFeatures('parking');
                    }}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Parkings
                  </Button>
                  <Button
                    variant={selectedCategory === 'terrain' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedCategory('terrain');
                      window.filterFeatures('terrain');
                    }}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Terrains
                  </Button>
                </Box>
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
          className="map-container"
        >
          <div ref={popupRef} className="ol-popup"></div>
        </div>

        {/* Styles pour l'animation de transition */}
        <style jsx>{`
          .map-container {
            position: relative;
            overflow: hidden;
          }
          .map-transition {
            transition: filter 0.5s ease, transform 0.5s ease;
            filter: brightness(1.1) contrast(0.9) blur(2px);
            transform: scale(1.02);
          }
          .map-transition .ol-viewport {
            transition: all 0.5s ease;
          }
          .map-transition .cesium-widget,
          .map-transition .ol-viewport canvas {
            animation: pulse 0.8s ease-in-out;
          }
          @keyframes pulse {
            0% { filter: brightness(1); }
            50% { filter: brightness(1.2); }
            100% { filter: brightness(1); }
          }
        `}</style>
      </Box>
    </Box>
  );
}

export default CartePage;





 