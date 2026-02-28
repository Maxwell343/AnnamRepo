import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  ArrowUp, ArrowDown, Package, DollarSign, Users, Truck,
  TrendingUp, Star, X, Map, Download, Scale, Search,
  SlidersHorizontal, Receipt, Clock, Award, BarChart3,
  Circle, MapPin, LayoutGrid, CircleDot
} from 'lucide-react';
import './RegionHeatmap.css';

interface Region {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  revenueDisplay: string;
  farmers: number;
  drivers: number;
  heat: 'high' | 'medium' | 'low';
  growth: number;
  coordinates: { x: number; y: number };
  avgOrderValue: number;
  topProducts: string[];
  deliveryTime: number;
  satisfaction: number;
}

interface TimeRange {
  label: string;
  value: string;
}

interface TooltipData {
  region: Region;
  x: number;
  y: number;
}

type MetricType = 'orders' | 'revenue' | 'farmers' | 'drivers';
type SortType = 'name' | 'orders' | 'revenue' | 'growth';
type ViewMode = 'heatmap' | 'bubbles' | 'bars' | 'map';

const mockRegions: Region[] = [
  { 
    id: '1', 
    name: 'Pune City', 
    orders: 342, 
    revenue: 428000,
    revenueDisplay: '₹4,28,000', 
    farmers: 45, 
    drivers: 18, 
    heat: 'high',
    growth: 23.5,
    coordinates: { x: 45, y: 55 },
    avgOrderValue: 1251,
    topProducts: ['Tomatoes', 'Onions', 'Potatoes'],
    deliveryTime: 32,
    satisfaction: 4.7
  },
  { 
    id: '2', 
    name: 'Mumbai Suburbs', 
    orders: 286, 
    revenue: 362000,
    revenueDisplay: '₹3,62,000', 
    farmers: 38, 
    drivers: 22, 
    heat: 'high',
    growth: 18.2,
    coordinates: { x: 25, y: 45 },
    avgOrderValue: 1266,
    topProducts: ['Leafy Greens', 'Fruits', 'Herbs'],
    deliveryTime: 45,
    satisfaction: 4.5
  },
  { 
    id: '3', 
    name: 'Nashik', 
    orders: 156, 
    revenue: 194000,
    revenueDisplay: '₹1,94,000', 
    farmers: 52, 
    drivers: 12, 
    heat: 'medium',
    growth: 31.8,
    coordinates: { x: 35, y: 25 },
    avgOrderValue: 1244,
    topProducts: ['Grapes', 'Onions', 'Pomegranate'],
    deliveryTime: 28,
    satisfaction: 4.8
  },
  { 
    id: '4', 
    name: 'Kolhapur', 
    orders: 118, 
    revenue: 148000,
    revenueDisplay: '₹1,48,000', 
    farmers: 34, 
    drivers: 8, 
    heat: 'medium',
    growth: 12.4,
    coordinates: { x: 30, y: 75 },
    avgOrderValue: 1254,
    topProducts: ['Sugarcane', 'Jaggery', 'Turmeric'],
    deliveryTime: 35,
    satisfaction: 4.6
  },
  { 
    id: '5', 
    name: 'Aurangabad', 
    orders: 82, 
    revenue: 98000,
    revenueDisplay: '₹98,000', 
    farmers: 24, 
    drivers: 6, 
    heat: 'low',
    growth: 45.2,
    coordinates: { x: 60, y: 35 },
    avgOrderValue: 1195,
    topProducts: ['Cotton', 'Soybean', 'Pulses'],
    deliveryTime: 42,
    satisfaction: 4.4
  },
  { 
    id: '6', 
    name: 'Nagpur', 
    orders: 64, 
    revenue: 76000,
    revenueDisplay: '₹76,000', 
    farmers: 18, 
    drivers: 5, 
    heat: 'low',
    growth: 67.3,
    coordinates: { x: 85, y: 30 },
    avgOrderValue: 1188,
    topProducts: ['Oranges', 'Chilies', 'Rice'],
    deliveryTime: 38,
    satisfaction: 4.3
  },
  { 
    id: '7', 
    name: 'Solapur', 
    orders: 94, 
    revenue: 112000,
    revenueDisplay: '₹1,12,000', 
    farmers: 28, 
    drivers: 7, 
    heat: 'medium',
    growth: 28.9,
    coordinates: { x: 55, y: 65 },
    avgOrderValue: 1191,
    topProducts: ['Pomegranate', 'Grapes', 'Onions'],
    deliveryTime: 30,
    satisfaction: 4.5
  },
  { 
    id: '8', 
    name: 'Satara', 
    orders: 72, 
    revenue: 86000,
    revenueDisplay: '₹86,000', 
    farmers: 22, 
    drivers: 5, 
    heat: 'low',
    growth: 35.6,
    coordinates: { x: 38, y: 68 },
    avgOrderValue: 1194,
    topProducts: ['Strawberries', 'Milk', 'Honey'],
    deliveryTime: 33,
    satisfaction: 4.6
  },
];

const timeRanges: TimeRange[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
];

const AnimatedCounter: React.FC<{ value: number; prefix?: string; suffix?: string; duration?: number }> = ({ 
  value, 
  prefix = '', 
  suffix = '',
  duration = 1000 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;
    
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue.current + (value - startValue.current) * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

const RegionHeatmap: React.FC = () => {
  const [metric, setMetric] = useState<MetricType>('orders');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('orders');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState('month');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showFilters, setShowFilters] = useState(false);
  const [heatFilter, setHeatFilter] = useState<string[]>(['high', 'medium', 'low']);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [compareRegions, setCompareRegions] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Animate on metric change
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [metric]);

  // Filtered and sorted regions
  const filteredRegions = useMemo(() => {
    return mockRegions
      .filter(region => {
        const matchesSearch = region.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesHeat = heatFilter.includes(region.heat);
        return matchesSearch && matchesHeat;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'orders':
            comparison = a.orders - b.orders;
            break;
          case 'revenue':
            comparison = a.revenue - b.revenue;
            break;
          case 'growth':
            comparison = a.growth - b.growth;
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [searchQuery, sortBy, sortOrder, heatFilter]);

  // Totals
  const totals = useMemo(() => ({
    orders: mockRegions.reduce((s, r) => s + r.orders, 0),
    revenue: mockRegions.reduce((s, r) => s + r.revenue, 0),
    farmers: mockRegions.reduce((s, r) => s + r.farmers, 0),
    drivers: mockRegions.reduce((s, r) => s + r.drivers, 0),
  }), []);

  // Max values for scaling
  const maxValues = useMemo(() => ({
    orders: Math.max(...mockRegions.map(r => r.orders)),
    revenue: Math.max(...mockRegions.map(r => r.revenue)),
    farmers: Math.max(...mockRegions.map(r => r.farmers)),
    drivers: Math.max(...mockRegions.map(r => r.drivers)),
  }), []);

  const selected = selectedRegion ? mockRegions.find((r) => r.id === selectedRegion) : null;

  const getMetricValue = useCallback((region: Region): number => {
    switch (metric) {
      case 'orders': return region.orders;
      case 'revenue': return region.revenue;
      case 'farmers': return region.farmers;
      case 'drivers': return region.drivers;
    }
  }, [metric]);

  const getMetricDisplay = useCallback((region: Region): string => {
    switch (metric) {
      case 'orders': return String(region.orders);
      case 'revenue': return region.revenueDisplay;
      case 'farmers': return String(region.farmers);
      case 'drivers': return String(region.drivers);
    }
  }, [metric]);

  const getHeatColor = useCallback((heat: string, opacity: number = 1): string => {
    switch (heat) {
      case 'high': return `rgba(16, 185, 129, ${opacity})`;
      case 'medium': return `rgba(251, 191, 36, ${opacity})`;
      case 'low': return `rgba(239, 68, 68, ${opacity})`;
      default: return `rgba(156, 163, 175, ${opacity})`;
    }
  }, []);

  const handleRegionHover = useCallback((region: Region, event: React.MouseEvent) => {
    setHoveredRegion(region.id);
    const rect = mapRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        region,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  }, []);

  const handleRegionLeave = useCallback(() => {
    setHoveredRegion(null);
    setTooltip(null);
  }, []);

  const handleRegionClick = useCallback((regionId: string) => {
    if (compareMode) {
      setCompareRegions(prev => {
        if (prev.includes(regionId)) {
          return prev.filter(id => id !== regionId);
        }
        if (prev.length < 3) {
          return [...prev, regionId];
        }
        return prev;
      });
    } else {
      setSelectedRegion(prev => prev === regionId ? null : regionId);
    }
  }, [compareMode]);

  const toggleHeatFilter = useCallback((heat: string) => {
    setHeatFilter(prev => {
      if (prev.includes(heat)) {
        return prev.filter(h => h !== heat);
      }
      return [...prev, heat];
    });
  }, []);

  const handleExport = useCallback(() => {
    const data = filteredRegions.map(r => ({
      Name: r.name,
      Orders: r.orders,
      Revenue: r.revenueDisplay,
      Farmers: r.farmers,
      Drivers: r.drivers,
      Activity: r.heat,
      Growth: `${r.growth}%`,
    }));
    
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `region-heatmap-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRegions, timeRange]);

  const renderHeatmapView = () => (
    <div className="heatmap-grid">
      {filteredRegions.map((region, index) => {
        const intensity = getMetricValue(region) / maxValues[metric];
        const isSelected = selectedRegion === region.id;
        const isHovered = hoveredRegion === region.id;
        const isComparing = compareRegions.includes(region.id);
        
        return (
          <div
            key={region.id}
            className={`heatmap-cell ${isSelected ? 'heatmap-cell--selected' : ''} ${isHovered ? 'heatmap-cell--hovered' : ''} ${isComparing ? 'heatmap-cell--comparing' : ''}`}
            style={{
              '--intensity': intensity,
              '--heat-color': getHeatColor(region.heat),
              '--delay': `${index * 50}ms`,
            } as React.CSSProperties}
            onClick={() => handleRegionClick(region.id)}
            onMouseEnter={(e) => handleRegionHover(region, e)}
            onMouseLeave={handleRegionLeave}
          >
            <div className="heatmap-cell__content">
              <div className="heatmap-cell__name">{region.name}</div>
              <div className="heatmap-cell__value">{getMetricDisplay(region)}</div>
              <div className="heatmap-cell__growth">
                <span className={`growth-indicator ${region.growth >= 0 ? 'positive' : 'negative'}`}>
                  {region.growth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {Math.abs(region.growth)}%
                </span>
              </div>
            </div>
            <div className="heatmap-cell__bar" style={{ width: `${intensity * 100}%` }} />
          </div>
        );
      })}
    </div>
  );

  const renderBubblesView = () => (
    <div className="bubbles-container" ref={mapRef}>
      <div className="bubbles__title">
        <h3>Regional Bubble Chart</h3>
        <p>Bubble size represents {metric} volume • Click to select</p>
      </div>
      <svg className="bubbles-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="bubbleShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
          </filter>
          <radialGradient id="highGradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#059669" stopOpacity="0.85"/>
          </radialGradient>
          <radialGradient id="mediumGradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.85"/>
          </radialGradient>
          <radialGradient id="lowGradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.80"/>
          </radialGradient>
        </defs>

        {/* Subtle grid background */}
        <g className="bubbles__grid" opacity="0.06">
          {[100, 200, 300, 400, 500, 600, 700].map(x => (
            <line key={`gx-${x}`} x1={x} y1="20" x2={x} y2="480" stroke="#6b7280" strokeWidth="1" />
          ))}
          {[100, 200, 300, 400].map(y => (
            <line key={`gy-${y}`} x1="50" y1={y} x2="750" y2={y} stroke="#6b7280" strokeWidth="1" />
          ))}
        </g>

        {/* Connection lines between nearby regions */}
        {filteredRegions.map((region, i) => 
          filteredRegions.slice(i + 1).map((otherRegion) => {
            const rx = region.coordinates.x * 8;
            const ry = region.coordinates.y * 5;
            const ox = otherRegion.coordinates.x * 8;
            const oy = otherRegion.coordinates.y * 5;
            const distance = Math.sqrt(Math.pow(rx - ox, 2) + Math.pow(ry - oy, 2));
            if (distance < 250) {
              const isEitherActive = hoveredRegion === region.id || hoveredRegion === otherRegion.id ||
                                     selectedRegion === region.id || selectedRegion === otherRegion.id;
              return (
                <line
                  key={`${region.id}-${otherRegion.id}`}
                  x1={rx}
                  y1={ry}
                  x2={ox}
                  y2={oy}
                  className={`connection-line ${isEitherActive ? 'connection-line--active' : ''}`}
                  strokeDasharray="6 4"
                />
              );
            }
            return null;
          })
        )}
        
        {/* Bubbles */}
        {filteredRegions.map((region, index) => {
          const value = getMetricValue(region);
          const max = maxValues[metric];
          const radius = 28 + (value / max) * 45;
          const cx = region.coordinates.x * 8;
          const cy = region.coordinates.y * 5;
          const isSelected = selectedRegion === region.id;
          const isHovered = hoveredRegion === region.id;
          const isComparing = compareRegions.includes(region.id);
          const isActive = isSelected || isHovered;
          
          return (
            <g
              key={region.id}
              className={`bubble-group ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isComparing ? 'comparing' : ''}`}
              style={{ '--delay': `${index * 100}ms` } as React.CSSProperties}
            >
              {/* Outer ring for selected/hovered */}
              {isActive && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius + 6}
                  fill="none"
                  stroke={getHeatColor(region.heat)}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  className="bubble-ring"
                  pointerEvents="none"
                />
              )}

              {/* Pulse effect for high activity */}
              {region.heat === 'high' && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  className="pulse-ring"
                  fill="none"
                  stroke={getHeatColor(region.heat)}
                  strokeWidth="2"
                  pointerEvents="none"
                />
              )}
              
              {/* Main bubble */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={`url(#${region.heat}Gradient)`}
                filter={isActive ? 'url(#glow)' : 'url(#bubbleShadow)'}
                className="bubble"
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                pointerEvents="none"
              />
              
              {/* White inner highlight */}
              <ellipse
                cx={cx - radius * 0.2}
                cy={cy - radius * 0.25}
                rx={radius * 0.3}
                ry={radius * 0.2}
                fill="rgba(255,255,255,0.25)"
                pointerEvents="none"
              />

              {/* Region name inside bubble */}
              <text
                x={cx}
                y={cy - 6}
                className="bubble-label-name"
                textAnchor="middle"
                pointerEvents="none"
              >
                {region.name}
              </text>

              {/* Metric value inside bubble */}
              <text
                x={cx}
                y={cy + 12}
                className="bubble-label-value"
                textAnchor="middle"
                pointerEvents="none"
              >
                {getMetricDisplay(region)}
              </text>

              {/* Growth badge below bubble */}
              <g transform={`translate(${cx - 22}, ${cy + radius + 6})`} pointerEvents="none">
                <rect
                  width="44" height="18" rx="9"
                  fill={region.growth >= 0 ? '#d1fae5' : '#fee2e2'}
                  stroke={region.growth >= 0 ? '#6ee7b7' : '#fca5a5'}
                  strokeWidth="1"
                />
                <foreignObject x="0" y="0" width="44" height="18">
                  <span
                    className="bubble-growth-text"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: region.growth >= 0 ? '#047857' : '#dc2626', fontSize: '9px', fontWeight: 700 }}
                  >
                    {region.growth >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{Math.abs(region.growth)}%
                  </span>
                </foreignObject>
              </g>

              {/* Invisible stable hit area — captures all pointer events */}
              <circle
                cx={cx}
                cy={cy}
                r={radius + 8}
                fill="transparent"
                stroke="none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRegionClick(region.id)}
                onMouseEnter={(e) => handleRegionHover(region, e as any)}
                onMouseLeave={handleRegionLeave}
              />
            </g>
          );
        })}
      </svg>
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="map-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="map-tooltip__header">{tooltip.region.name}</div>
          <div className="map-tooltip__content">
            <div className="map-tooltip__row">
              <span><Package size={14} /> Orders</span>
              <span>{tooltip.region.orders}</span>
            </div>
            <div className="map-tooltip__row">
              <span><DollarSign size={14} /> Revenue</span>
              <span>{tooltip.region.revenueDisplay}</span>
            </div>
            <div className="map-tooltip__row">
              <span><Users size={14} /> Farmers</span>
              <span>{tooltip.region.farmers}</span>
            </div>
            <div className="map-tooltip__row">
              <span><Truck size={14} /> Drivers</span>
              <span>{tooltip.region.drivers}</span>
            </div>
            <div className="map-tooltip__row">
              <span><TrendingUp size={14} /> Growth</span>
              <span className={tooltip.region.growth >= 0 ? 'positive' : 'negative'}>
                {tooltip.region.growth >= 0 ? '+' : ''}{tooltip.region.growth}%
              </span>
            </div>
            <div className="map-tooltip__row">
              <span><Star size={14} /> Rating</span>
              <span>{tooltip.region.satisfaction}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bubbles__legend">
        <div className="bubbles__legend-item">
          <span className="bubbles__legend-dot bubbles__legend-dot--high" />
          <span>High Activity</span>
        </div>
        <div className="bubbles__legend-item">
          <span className="bubbles__legend-dot bubbles__legend-dot--medium" />
          <span>Medium Activity</span>
        </div>
        <div className="bubbles__legend-item">
          <span className="bubbles__legend-dot bubbles__legend-dot--low" />
          <span>Low Activity</span>
        </div>
        <div className="bubbles__legend-size">
          <svg width="80" height="24" viewBox="0 0 80 24">
            <circle cx="12" cy="12" r="6" fill="#d1d5db" />
            <circle cx="36" cy="12" r="9" fill="#d1d5db" />
            <circle cx="66" cy="12" r="12" fill="#d1d5db" />
          </svg>
          <span>Size = {metric}</span>
        </div>
      </div>
    </div>
  );

  const renderBarsView = () => (
    <div className="bars-container">
      {filteredRegions.map((region, index) => {
        const percentage = (getMetricValue(region) / maxValues[metric]) * 100;
        const isSelected = selectedRegion === region.id;
        
        return (
          <div
            key={region.id}
            className={`bar-row ${isSelected ? 'bar-row--selected' : ''}`}
            onClick={() => handleRegionClick(region.id)}
            style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}
          >
            <div className="bar-row__info">
              <span className={`bar-row__heat bar-row__heat--${region.heat}`} />
              <span className="bar-row__name">{region.name}</span>
            </div>
            <div className="bar-row__bar-container">
              <div
                className={`bar-row__bar bar-row__bar--${region.heat}`}
                style={{ width: `${percentage}%` }}
              />
              <span className="bar-row__value">{getMetricDisplay(region)}</span>
            </div>
            <div className="bar-row__growth">
              <span className={region.growth >= 0 ? 'positive' : 'negative'}>
                {region.growth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {Math.abs(region.growth)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Maharashtra district paths (simplified SVG paths)
  const maharashtraDistricts: Record<string, { path: string; labelX: number; labelY: number }> = {
    '1': { // Pune City
      path: 'M 220,320 L 280,300 L 310,330 L 320,370 L 290,400 L 240,390 L 210,360 Z',
      labelX: 265, labelY: 350,
    },
    '2': { // Mumbai Suburbs 
      path: 'M 120,240 L 160,220 L 190,240 L 200,280 L 180,310 L 140,300 L 110,270 Z',
      labelX: 155, labelY: 270,
    },
    '3': { // Nashik
      path: 'M 180,130 L 250,110 L 300,130 L 310,180 L 280,210 L 220,220 L 180,190 Z',
      labelX: 245, labelY: 170,
    },
    '4': { // Kolhapur
      path: 'M 180,420 L 240,400 L 280,420 L 290,460 L 260,490 L 210,480 L 175,450 Z',
      labelX: 230, labelY: 450,
    },
    '5': { // Aurangabad
      path: 'M 330,150 L 400,130 L 450,160 L 460,210 L 420,240 L 360,240 L 320,210 Z',
      labelX: 390, labelY: 190,
    },
    '6': { // Nagpur
      path: 'M 530,130 L 600,110 L 650,140 L 660,200 L 630,240 L 570,240 L 520,200 Z',
      labelX: 590, labelY: 175,
    },
    '7': { // Solapur
      path: 'M 340,320 L 400,290 L 450,310 L 460,360 L 430,400 L 370,400 L 330,370 Z',
      labelX: 395, labelY: 350,
    },
    '8': { // Satara
      path: 'M 200,370 L 240,395 L 230,420 L 200,430 L 170,420 L 165,390 Z',
      labelX: 200, labelY: 405,
    },
  };

  const renderMapView = () => {
    const maharashtraOutline = 'M 80,100 L 150,60 L 250,40 L 380,50 L 500,60 L 600,50 L 680,80 L 700,160 L 690,260 L 660,320 L 600,380 L 500,420 L 400,460 L 300,500 L 200,490 L 140,460 L 100,400 L 80,320 L 70,220 Z';

    return (
      <div className="india-map-container" ref={mapRef}>
        <div className="india-map__title">
          <h3>Maharashtra Regional Activity Map</h3>
          <p>Click on a region to see details</p>
        </div>
        <svg
          className="india-map-svg"
          viewBox="0 0 780 540"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="mapShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            <filter id="regionGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="mapHighGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="mapMedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="mapLowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.85" />
            </linearGradient>
            <pattern id="mapPattern" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0,8 L 8,0" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Maharashtra outline */}
          <path
            d={maharashtraOutline}
            fill="url(#mapPattern)"
            stroke="#d1d5db"
            strokeWidth="2"
            filter="url(#mapShadow)"
            className="india-map__outline"
          />

          {/* District regions */}
          {filteredRegions.map((region, index) => {
            const district = maharashtraDistricts[region.id];
            if (!district) return null;

            const isSelected = selectedRegion === region.id;
            const isHovered = hoveredRegion === region.id;
            const isComparing = compareRegions.includes(region.id);
            const gradientId = region.heat === 'high' ? 'mapHighGrad' : region.heat === 'medium' ? 'mapMedGrad' : 'mapLowGrad';

            return (
              <g
                key={region.id}
                className={`india-map__region ${isSelected ? 'india-map__region--selected' : ''} ${isHovered ? 'india-map__region--hovered' : ''} ${isComparing ? 'india-map__region--comparing' : ''}`}
                style={{ animationDelay: `${index * 80}ms` }}
                onClick={() => handleRegionClick(region.id)}
                onMouseEnter={(e) => handleRegionHover(region, e as any)}
                onMouseLeave={handleRegionLeave}
              >
                <path
                  d={district.path}
                  fill={`url(#${gradientId})`}
                  stroke={isSelected ? '#111827' : isHovered ? '#374151' : '#ffffff'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                  className="india-map__district"
                  filter={isSelected || isHovered ? 'url(#regionGlow)' : undefined}
                />

                {/* Region label */}
                <text
                  x={district.labelX}
                  y={district.labelY - 12}
                  className="india-map__label"
                  textAnchor="middle"
                >
                  {region.name}
                </text>

                {/* Metric value */}
                <text
                  x={district.labelX}
                  y={district.labelY + 6}
                  className="india-map__value"
                  textAnchor="middle"
                >
                  {getMetricDisplay(region)}
                </text>

                {/* Growth badge */}
                <g transform={`translate(${district.labelX - 20}, ${district.labelY + 14})`}>
                  <rect
                    x="0" y="0" width="40" height="16" rx="8"
                    fill={region.growth >= 0 ? '#d1fae5' : '#fee2e2'}
                  />
                  <foreignObject x="0" y="0" width="40" height="16">
                    <span
                      className="india-map__growth"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: region.growth >= 0 ? '#059669' : '#dc2626', fontSize: '8px', fontWeight: 700 }}
                    >
                      {region.growth >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{Math.abs(region.growth)}%
                    </span>
                  </foreignObject>
                </g>

                {/* Pulse for high-activity regions */}
                {region.heat === 'high' && (
                  <circle
                    cx={district.labelX}
                    cy={district.labelY - 24}
                    r="4"
                    fill={getHeatColor(region.heat)}
                    className="india-map__pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Map scale / compass */}
          <g transform="translate(690, 460)">
            <circle r="20" fill="white" stroke="#e5e7eb" strokeWidth="1" />
            <text y="-5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#374151">N</text>
            <text y="12" textAnchor="middle" fontSize="8" fill="#9ca3af">S</text>
            <line x1="0" y1="-14" x2="0" y2="-7" stroke="#374151" strokeWidth="1.5" />
            <polygon points="0,-16 -3,-10 3,-10" fill="#374151" />
          </g>
        </svg>

        {tooltip && (
          <div
            className="map-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="map-tooltip__header">{tooltip.region.name}</div>
            <div className="map-tooltip__content">
              <div className="map-tooltip__row">
                <span>Orders</span>
                <span>{tooltip.region.orders}</span>
              </div>
              <div className="map-tooltip__row">
                <span>Revenue</span>
                <span>{tooltip.region.revenueDisplay}</span>
              </div>
              <div className="map-tooltip__row">
                <span>Farmers</span>
                <span>{tooltip.region.farmers}</span>
              </div>
              <div className="map-tooltip__row">
                <span>Growth</span>
                <span className={tooltip.region.growth >= 0 ? 'positive' : 'negative'}>
                  {tooltip.region.growth >= 0 ? '+' : ''}{tooltip.region.growth}%
                </span>
              </div>
              <div className="map-tooltip__row">
                <span>Rating</span>
                <span><Star size={14} /> {tooltip.region.satisfaction}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComparisonPanel = () => {
    const compareData = compareRegions.map(id => mockRegions.find(r => r.id === id)!).filter(Boolean);
    
    if (compareData.length === 0) return null;
    
    return (
      <div className="comparison-panel">
        <div className="comparison-panel__header">
          <h3>Comparing {compareData.length} Regions</h3>
          <button className="comparison-panel__close" onClick={() => setCompareRegions([])}>
            <X size={16} />
          </button>
        </div>
        <div className="comparison-grid">
          {compareData.map(region => (
            <div key={region.id} className="comparison-card">
              <div className="comparison-card__header">
                <span className={`comparison-card__heat comparison-card__heat--${region.heat}`} />
                <span className="comparison-card__name">{region.name}</span>
              </div>
              <div className="comparison-card__metrics">
                <div className="comparison-metric">
                  <span className="comparison-metric__label">Orders</span>
                  <span className="comparison-metric__value">{region.orders}</span>
                </div>
                <div className="comparison-metric">
                  <span className="comparison-metric__label">Revenue</span>
                  <span className="comparison-metric__value">{region.revenueDisplay}</span>
                </div>
                <div className="comparison-metric">
                  <span className="comparison-metric__label">Growth</span>
                  <span className={`comparison-metric__value ${region.growth >= 0 ? 'positive' : 'negative'}`}>
                    {region.growth >= 0 ? '+' : ''}{region.growth}%
                  </span>
                </div>
                <div className="comparison-metric">
                  <span className="comparison-metric__label">Satisfaction</span>
                  <span className="comparison-metric__value"><Star size={14} /> {region.satisfaction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="region-heatmap region-heatmap--loading">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading regional data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="region-heatmap">
      {/* Header */}
      <header className="region-heatmap__header">
        <div className="header-left">
          <h1 className="header-title">
            <span className="header-icon"><Map size={24} /></span>
            Region Heatmap
          </h1>
          <p className="header-subtitle">
            Visualize regional performance across {mockRegions.length} active regions
          </p>
        </div>
        
        <div className="header-actions">
          <div className="time-range-selector">
            {timeRanges.map(range => (
              <button
                key={range.value}
                className={`time-range-btn ${timeRange === range.value ? 'active' : ''}`}
                onClick={() => setTimeRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          <button className="action-btn" onClick={handleExport}>
            <span className="action-btn__icon"><Download size={16} /></span>
            Export
          </button>
          
          <button 
            className={`action-btn ${compareMode ? 'active' : ''}`}
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setCompareRegions([]);
            }}
          >
            <span className="action-btn__icon"><Scale size={16} /></span>
            {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="controls-left">
          <div className="search-box">
            <span className="search-icon"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Search regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}><X size={14} /></button>
            )}
          </div>
          
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <Map size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'heatmap' ? 'active' : ''}`}
              onClick={() => setViewMode('heatmap')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'bubbles' ? 'active' : ''}`}
              onClick={() => setViewMode('bubbles')}
              title="Bubble Map"
            >
              <CircleDot size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'bars' ? 'active' : ''}`}
              onClick={() => setViewMode('bars')}
              title="Bar Chart"
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>
        
        <div className="controls-right">
          <div className="metric-selector">
            <label>Metric:</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricType)}
              className="metric-select"
            >
              <option value="orders">Orders</option>
              <option value="revenue">Revenue</option>
              <option value="farmers">Farmers</option>
              <option value="drivers">Drivers</option>
            </select>
          </div>
          
          <div className="sort-selector">
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="sort-select"
            >
              <option value="orders">Orders</option>
              <option value="revenue">Revenue</option>
              <option value="growth">Growth</option>
              <option value="name">Name</option>
            </select>
            <button
              className="sort-order-btn"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
            </button>
          </div>
          
          <button
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <span><SlidersHorizontal size={16} /></span> Filters
            {heatFilter.length < 3 && (
              <span className="filter-badge">{3 - heatFilter.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <span className="filter-group__label">Activity Level:</span>
            <div className="filter-chips">
              {['high', 'medium', 'low'].map(heat => (
                <button
                  key={heat}
                  className={`filter-chip filter-chip--${heat} ${heatFilter.includes(heat) ? 'active' : ''}`}
                  onClick={() => toggleHeatFilter(heat)}
                >
                  <span className="filter-chip__dot" />
                  {heat.charAt(0).toUpperCase() + heat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compare Mode Banner */}
      {compareMode && (
        <div className="compare-banner">
          <span className="compare-banner__icon"><Scale size={16} /></span>
          <span>Compare Mode: Select up to 3 regions to compare ({compareRegions.length}/3 selected)</span>
        </div>
      )}

      {/* Main Content */}
      <div className="region-heatmap__content">
        <div className={`region-heatmap__map ${isAnimating ? 'animating' : ''}`}>
          {/* Show chart OR selected region report */}
          {selected && !compareMode ? (
            <div className="region-report">
              <div className="region-report__header">
                <div className="region-report__title-row">
                  <span className={`region-report__heat region-report__heat--${selected.heat}`} />
                  <h2 className="region-report__name">{selected.name}</h2>
                  <span className={`region-report__growth ${selected.growth >= 0 ? 'positive' : 'negative'}`}>
                    {selected.growth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {Math.abs(selected.growth)}%
                  </span>
                </div>
                <button className="region-report__close" onClick={() => setSelectedRegion(null)}><X size={14} /> Back to Map</button>
              </div>

              <div className="region-report__stats">
                <div className="region-report__stat">
                  <span className="region-report__stat-icon"><Package size={20} /></span>
                  <div className="region-report__stat-info">
                    <span className="region-report__stat-value">{selected.orders}</span>
                    <span className="region-report__stat-label">Total Orders</span>
                  </div>
                </div>
                <div className="region-report__stat">
                  <span className="region-report__stat-icon"><DollarSign size={20} /></span>
                  <div className="region-report__stat-info">
                    <span className="region-report__stat-value">{selected.revenueDisplay}</span>
                    <span className="region-report__stat-label">Revenue</span>
                  </div>
                </div>
                <div className="region-report__stat">
                  <span className="region-report__stat-icon"><Users size={20} /></span>
                  <div className="region-report__stat-info">
                    <span className="region-report__stat-value">{selected.farmers}</span>
                    <span className="region-report__stat-label">Farmers</span>
                  </div>
                </div>
                <div className="region-report__stat">
                  <span className="region-report__stat-icon"><Truck size={20} /></span>
                  <div className="region-report__stat-info">
                    <span className="region-report__stat-value">{selected.drivers}</span>
                    <span className="region-report__stat-label">Drivers</span>
                  </div>
                </div>
                <div className="region-report__stat">
                  <span className="region-report__stat-icon"><Receipt size={20} /></span>
                  <div className="region-report__stat-info">
                    <span className="region-report__stat-value">₹{selected.avgOrderValue}</span>
                    <span className="region-report__stat-label">Avg Order</span>
                  </div>
                </div>
                <div className="region-report__stat">
                  <span className="region-report__stat-icon"><Clock size={20} /></span>
                  <div className="region-report__stat-info">
                    <span className="region-report__stat-value">{selected.deliveryTime} min</span>
                    <span className="region-report__stat-label">Delivery Time</span>
                  </div>
                </div>
              </div>

              <div className="region-report__sections">
                <div className="region-report__section">
                  <h4>Performance</h4>
                  <div className="region-report__bar-container">
                    <div className="region-report__bar">
                      <div className="region-report__bar-fill" style={{ width: `${(selected.orders / maxValues.orders) * 100}%` }} />
                    </div>
                    <span className="region-report__bar-label">{Math.round((selected.orders / maxValues.orders) * 100)}% of top region</span>
                  </div>
                  <div className="region-report__perf-row">
                    <span>Growth: <strong className={selected.growth >= 0 ? 'positive' : 'negative'}>
                      {selected.growth >= 0 ? '+' : ''}{selected.growth}%
                    </strong></span>
                    <span>Rating: <strong><Star size={14} /> {selected.satisfaction}</strong></span>
                  </div>
                </div>

                <div className="region-report__section">
                  <h4>Top Products</h4>
                  <div className="region-report__products">
                    {selected.topProducts.map((product, i) => (
                      <span key={product} className="region-report__product-tag">
                        {[<Award key="g" size={14} color="#FFD700" />, <Award key="s" size={14} color="#C0C0C0" />, <Award key="b" size={14} color="#CD7F32" />][i]} {product}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="region-report__section">
                  <h4>Quick Insights</h4>
                  <div className="region-report__insights">
                    <div className="region-report__insight">
                      <span className="region-report__insight-icon"><BarChart3 size={16} /></span>
                      <span>Revenue per farmer: <strong>₹{Math.round(selected.revenue / selected.farmers).toLocaleString('en-IN')}</strong></span>
                    </div>
                    <div className="region-report__insight">
                      <span className="region-report__insight-icon"><TrendingUp size={16} /></span>
                      <span>Orders per driver: <strong>{Math.round(selected.orders / selected.drivers)}</strong></span>
                    </div>
                    <div className="region-report__insight">
                      <span className="region-report__insight-icon">{selected.heat === 'high' ? <Circle size={16} fill="#10b981" color="#10b981" /> : selected.heat === 'medium' ? <Circle size={16} fill="#f59e0b" color="#f59e0b" /> : <Circle size={16} fill="#ef4444" color="#ef4444" />}</span>
                      <span>Activity level: <strong style={{ textTransform: 'capitalize' }}>{selected.heat}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="region-report__actions">
                <button 
                  className="details-btn details-btn--primary"
                  onClick={() => {
                    if (selected) {
                      try {
                        const doc = new jsPDF();
                        const pageWidth = doc.internal.pageSize.getWidth();
                        let yPosition = 20;
                        
                        doc.setFontSize(24);
                        doc.text(`${selected.name} Regional Report`, pageWidth / 2, yPosition, { align: 'center' });
                        yPosition += 15;
                        
                        doc.setFontSize(11);
                        doc.setTextColor(100, 100, 100);
                        doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
                        yPosition += 15;
                        
                        doc.setFontSize(10);
                        doc.setTextColor(0, 0, 0);
                        doc.text(`Activity Level: ${selected.heat.toUpperCase()}`, 20, yPosition);
                        yPosition += 12;
                        
                        doc.setFontSize(14);
                        doc.setTextColor(0, 0, 0);
                        doc.text('Key Metrics', 20, yPosition);
                        yPosition += 10;
                        
                        doc.setFontSize(10);
                        doc.setTextColor(60, 60, 60);
                        const metrics = [
                          `Orders: ${selected.orders}`,
                          `Revenue: ${selected.revenueDisplay}`,
                          `Farmers: ${selected.farmers}`,
                          `Drivers: ${selected.drivers}`,
                          `Avg Order Value: ₹${selected.avgOrderValue}`,
                          `Delivery Time: ${selected.deliveryTime} min`,
                          `Growth: ${selected.growth >= 0 ? '+' : ''}${selected.growth}%`,
                          `Customer Rating: ${selected.satisfaction}`
                        ];
                        
                        metrics.forEach((metric) => {
                          doc.text(metric, 30, yPosition);
                          yPosition += 8;
                        });
                        
                        yPosition += 8;
                        doc.setFontSize(14);
                        doc.setTextColor(0, 0, 0);
                        doc.text('Top Products', 20, yPosition);
                        yPosition += 10;
                        
                        doc.setFontSize(10);
                        doc.setTextColor(60, 60, 60);
                        selected.topProducts.forEach((product, idx) => {
                          const medals = ['#1', '#2', '#3'];
                          doc.text(`${medals[idx]} ${product}`, 30, yPosition);
                          yPosition += 8;
                        });
                        
                        doc.save(`${selected.name}_Report.pdf`);
                      } catch (error) {
                        console.error('PDF export failed:', error);
                        alert('Failed to generate PDF. Please try again.');
                      }
                    }
                  }}
                >
                  View Full Report
                </button>
                <button 
                  className="details-btn details-btn--secondary"
                  onClick={() => {
                    if (selected) {
                      const contactMessage = [
                        `I would like to contact ${selected.name} region.`,
                        '',
                        'Region Details:',
                        `- Orders: ${selected.orders}`,
                        `- Farmers: ${selected.farmers}`,
                        `- Drivers: ${selected.drivers}`,
                        `- Status: ${selected.heat.toUpperCase()}`
                      ].join('\n');
                      
                      if (navigator.share) {
                        navigator.share({
                          title: `Contact - ${selected.name}`,
                          text: contactMessage
                        }).catch(() => {
                          // Fallback: copy to clipboard
                          navigator.clipboard.writeText(contactMessage);
                          alert('Region details copied to clipboard. Share via your preferred contact method.');
                        });
                      } else {
                        // Fallback for browsers without share API
                        navigator.clipboard.writeText(contactMessage);
                        alert(`Contact details for ${selected.name}:\n\n${contactMessage}\n\nDetails copied to clipboard!`);
                      }
                    }
                  }}
                >
                  Contact Region
                </button>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'map' && renderMapView()}
              {viewMode === 'heatmap' && renderHeatmapView()}
              {viewMode === 'bubbles' && renderBubblesView()}
              {viewMode === 'bars' && renderBarsView()}
              
              {filteredRegions.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state__icon"><Search size={48} /></div>
                  <h3>No regions found</h3>
                  <p>Try adjusting your search or filters</p>
                  <button 
                    className="empty-state__btn"
                    onClick={() => {
                      setSearchQuery('');
                      setHeatFilter(['high', 'medium', 'low']);
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
              
              {/* Legend */}
              <div className="map-legend">
                <span className="map-legend__title">Activity Level:</span>
                <div className="map-legend__items">
                  <div className="map-legend__item">
                    <span className="map-legend__dot map-legend__dot--high" />
                    High
                  </div>
                  <div className="map-legend__item">
                    <span className="map-legend__dot map-legend__dot--medium" />
                    Medium
                  </div>
                  <div className="map-legend__item">
                    <span className="map-legend__dot map-legend__dot--low" />
                    Low
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="region-heatmap__sidebar">
          {/* Overview Card */}
          <div className="sidebar-card sidebar-card--overview">
            <div className="sidebar-card__header">
              <h3>Overview</h3>
              <span className="sidebar-card__badge">{timeRanges.find(t => t.value === timeRange)?.label}</span>
            </div>
            <div className="overview-grid">
              <div className="overview-item">
                <div className="overview-item__icon"><MapPin size={20} /></div>
                <div className="overview-item__content">
                  <div className="overview-item__value">
                    <AnimatedCounter value={mockRegions.length} />
                  </div>
                  <div className="overview-item__label">Active Regions</div>
                </div>
              </div>
              <div className="overview-item">
                <div className="overview-item__icon"><Package size={20} /></div>
                <div className="overview-item__content">
                  <div className="overview-item__value">
                    <AnimatedCounter value={totals.orders} />
                  </div>
                  <div className="overview-item__label">Total Orders</div>
                </div>
              </div>
              <div className="overview-item">
                <div className="overview-item__icon"><Users size={20} /></div>
                <div className="overview-item__content">
                  <div className="overview-item__value">
                    <AnimatedCounter value={totals.farmers} />
                  </div>
                  <div className="overview-item__label">Farmers</div>
                </div>
              </div>
              <div className="overview-item">
                <div className="overview-item__icon"><Truck size={20} /></div>
                <div className="overview-item__content">
                  <div className="overview-item__value">
                    <AnimatedCounter value={totals.drivers} />
                  </div>
                  <div className="overview-item__label">Drivers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Regions List */}
          <div className="sidebar-card">
            <div className="sidebar-card__header">
              <h3>Regions</h3>
              <span className="sidebar-card__count">{filteredRegions.length}</span>
            </div>
            <div className="regions-list">
              {filteredRegions.map((region, index) => (
                <div
                  key={region.id}
                  className={`region-item ${selectedRegion === region.id ? 'region-item--selected' : ''} ${hoveredRegion === region.id ? 'region-item--hovered' : ''}`}
                  onClick={() => handleRegionClick(region.id)}
                  onMouseEnter={() => setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ '--index': index } as React.CSSProperties}
                >
                  <div className="region-item__left">
                    <span className={`region-item__heat region-item__heat--${region.heat}`} />
                    <div className="region-item__info">
                      <span className="region-item__name">{region.name}</span>
                      <span className="region-item__meta">
                        {region.farmers} farmers • {region.drivers} drivers
                      </span>
                    </div>
                  </div>
                  <div className="region-item__right">
                    <div className="region-item__value">{getMetricDisplay(region)}</div>
                    <div className={`region-item__growth ${region.growth >= 0 ? 'positive' : 'negative'}`}>
                      {region.growth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {Math.abs(region.growth)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Region Details - now shown in main map area */}
          
          {/* Comparison Panel */}
          {compareMode && renderComparisonPanel()}
        </aside>
      </div>
    </div>
  );
};

export default RegionHeatmap;