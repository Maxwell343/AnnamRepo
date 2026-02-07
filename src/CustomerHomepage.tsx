import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerHomePage.css';

// --- Types ---
interface Product {
  id: number;
  farmer_id: number;
  farmer_name: string;
  farmer_rating?: number;
  title: string;
  quantity: string;
  available_quantity: number;
  price: number;
  unit: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Dairy' | 'Other';
  category?: string;
  expiry?: string;
  expiry_date?: string;
  description?: string;
  image?: string;
  images?: string[];
  created_at?: string;
  location?: string;
  distance?: string;
  organic?: boolean;
  discount_percentage?: number;
  original_price?: number;
  rating?: number;
  reviews_count?: number;
  sold_count?: number;
  tags?: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Order {
  id: number;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  created_at: string;
  delivery_address: string;
  estimated_delivery?: string;
  driver_name?: string;
  driver_phone?: string;
}

interface User {
  id: number;
  name: string;
  role: 'customer';
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  loyalty_points?: number;
  saved_addresses?: string[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

// Utility functions
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const CustomerHomePage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [showCart, setShowCart] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  // Categories
  const categories: Category[] = [
    { id: 'all', name: 'All Items', icon: '🛒', color: '#10b981', count: products.length },
    { id: 'vegetable', name: 'Vegetables', icon: '🥦', color: '#22c55e', count: products.filter(p => p.type === 'Vegetable').length },
    { id: 'fruit', name: 'Fruits', icon: '🍎', color: '#ef4444', count: products.filter(p => p.type === 'Fruit').length },
    { id: 'grain', name: 'Grains', icon: '🌾', color: '#f59e0b', count: products.filter(p => p.type === 'Grain').length },
    { id: 'dairy', name: 'Dairy', icon: '🥛', color: '#3b82f6', count: products.filter(p => p.type === 'Dairy').length },
    { id: 'organic', name: 'Organic', icon: '🌿', color: '#059669', count: products.filter(p => p.organic).length },
  ];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch farmer listings from the main listings endpoint
      const response = await fetch('http://localhost:8000/api/listings');
      const data = await response.json();
      
      if (response.ok && data.listings && data.listings.length > 0) {
        // Map farmer listings to product format
        const mappedProducts = data.listings.map((listing: any) => ({
          id: listing._id || listing.id,
          farmer_id: listing.farmer_id,
          farmer_name: listing.farmer_name || 'Unknown Farmer',
          farmer_rating: 4.5,
          title: listing.title,
          quantity: listing.quantity?.toString(),
          available_quantity: listing.quantity,
          price: listing.price || 0,
          unit: listing.unit || 'kg',
          type: listing.type || 'Other',
          description: listing.description,
          image: listing.images?.[0] || 'https://images.unsplash.com/photo-1488459716781-6f3ee4042e8f?w=400',
          location: listing.location || 'Unknown',
          distance: '0 km',
          organic: false,
          discount_percentage: 0,
          rating: 4.5,
          reviews_count: 10,
          sold_count: 0,
          tags: [listing.type, 'Farm Fresh'],
          created_at: listing.created_at || new Date().toISOString()
        }));
        
        setProducts(mappedProducts);
        
        // Set featured products (first 6 or all if less)
        setFeaturedProducts(mappedProducts.slice(0, 6));
      } else {
        // Use mock data if API returns empty
        throw new Error('No products available');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      // Mock data for demo - shows when no real listings exist
      const mockProducts: Product[] = [
        {
          id: 1,
          farmer_id: 1,
          farmer_name: "Rajesh Farms",
          farmer_rating: 4.8,
          title: "Fresh Organic Tomatoes",
          quantity: "50kg",
          available_quantity: 50,
          price: 45,
          unit: "kg",
          type: "Vegetable",
          description: "Farm-fresh organic tomatoes, hand-picked daily",
          image: "https://images.unsplash.com/photo-1546470427-0d4db154cdb8?w=400",
          location: "Punjab",
          distance: "5.2 km",
          organic: true,
          discount_percentage: 15,
          original_price: 53,
          rating: 4.8,
          reviews_count: 124,
          sold_count: 2340,
          tags: ["Organic", "Farm Fresh", "Daily Harvest"]
        },
        {
          id: 2,
          farmer_id: 2,
          farmer_name: "Green Valley",
          farmer_rating: 4.5,
          title: "Premium Alphonso Mangoes",
          quantity: "30kg",
          available_quantity: 30,
          price: 350,
          unit: "kg",
          type: "Fruit",
          description: "Sweet and juicy Alphonso mangoes from Ratnagiri",
          image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400",
          location: "Maharashtra",
          distance: "12.8 km",
          organic: true,
          rating: 4.9,
          reviews_count: 89,
          sold_count: 1560,
          tags: ["Premium", "Seasonal", "Gift Pack Available"]
        },
        {
          id: 3,
          farmer_id: 3,
          farmer_name: "Sunrise Agro",
          farmer_rating: 4.6,
          title: "Basmati Rice - Long Grain",
          quantity: "100kg",
          available_quantity: 100,
          price: 120,
          unit: "kg",
          type: "Grain",
          description: "Aged premium basmati rice with aromatic fragrance",
          image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
          location: "Haryana",
          distance: "8.5 km",
          organic: false,
          discount_percentage: 10,
          original_price: 133,
          rating: 4.7,
          reviews_count: 256,
          sold_count: 4520,
          tags: ["Aged", "Premium Quality", "Bulk Available"]
        },
        {
          id: 4,
          farmer_id: 4,
          farmer_name: "Happy Cows Dairy",
          farmer_rating: 4.9,
          title: "Fresh Farm Milk",
          quantity: "20L",
          available_quantity: 20,
          price: 65,
          unit: "L",
          type: "Dairy",
          description: "Pure A2 milk from grass-fed cows, delivered fresh",
          image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
          location: "Gujarat",
          distance: "3.2 km",
          organic: true,
          rating: 4.9,
          reviews_count: 412,
          sold_count: 8900,
          tags: ["A2 Milk", "Grass Fed", "Daily Delivery"]
        },
        {
          id: 5,
          farmer_id: 5,
          farmer_name: "Nature's Bounty",
          farmer_rating: 4.4,
          title: "Mixed Vegetable Box",
          quantity: "10kg",
          available_quantity: 25,
          price: 299,
          unit: "box",
          type: "Vegetable",
          description: "Curated box of seasonal vegetables, perfect for a week",
          image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
          location: "Karnataka",
          distance: "6.7 km",
          organic: true,
          discount_percentage: 20,
          original_price: 374,
          rating: 4.6,
          reviews_count: 178,
          sold_count: 3200,
          tags: ["Weekly Box", "Variety Pack", "Best Seller"]
        },
        {
          id: 6,
          farmer_id: 6,
          farmer_name: "Golden Orchards",
          farmer_rating: 4.7,
          title: "Fresh Apples - Shimla",
          quantity: "40kg",
          available_quantity: 40,
          price: 180,
          unit: "kg",
          type: "Fruit",
          description: "Crisp and sweet apples from Shimla orchards",
          image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
          location: "Himachal Pradesh",
          distance: "15.3 km",
          organic: false,
          rating: 4.5,
          reviews_count: 92,
          sold_count: 1890,
          tags: ["Mountain Fresh", "Natural", "Premium"]
        }
      ];
      setProducts(mockProducts);
      setFeaturedProducts(mockProducts.slice(0, 4));
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders
  const fetchOrders = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/customers/${userId}/orders`);
      const data = await response.json();
      
      if (response.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      // Mock orders
      setOrders([
        {
          id: 1001,
          items: [],
          total: 1250,
          status: 'out_for_delivery',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          delivery_address: "123 Main Street, Bangalore",
          estimated_delivery: "Today, 4:00 PM - 5:00 PM",
          driver_name: "Amit Kumar",
          driver_phone: "+91 98765 43210"
        }
      ]);
    }
  };

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('customerCart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }

    const savedWishlist = localStorage.getItem('customerWishlist');
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (e) {
        console.error('Error loading wishlist:', e);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('customerCart', JSON.stringify(cart));
  }, [cart]);

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('customerWishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Check authentication
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.role === 'customer') {
          setUser(parsedUser);
          fetchOrders(parsedUser.id);
        } else {
          navigate('/auth');
          return;
        }
      } catch (e) {
        navigate('/auth');
        return;
      }
    } else {
      navigate('/auth');
      return;
    }
    fetchProducts();
  }, [navigate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowCart(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close cart when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) {
        setShowCart(false);
      }
    };

    if (showCart) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCart]);

  // Cart functions
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.available_quantity) }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });

    // Show toast notification
    showToast(`${product.title} added to cart!`, 'success');
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.available_quantity) }
          : item
      )
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  // Wishlist functions
  const toggleWishlist = (productId: number) => {
    setWishlist(prev => {
      if (prev.includes(productId)) {
        showToast('Removed from wishlist', 'info');
        return prev.filter(id => id !== productId);
      } else {
        showToast('Added to wishlist!', 'success');
        return [...prev, productId];
      }
    });
  };

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-message">${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Filter and sort products
  const getFilteredProducts = () => {
    let filtered = [...products];

    // Category filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'organic') {
        filtered = filtered.filter(p => p.organic);
      } else {
        filtered = filtered.filter(p => p.type.toLowerCase() === activeCategory);
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.farmer_name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
        break;
      default:
        break;
    }

    return filtered;
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('customerCart');
    navigate('/');
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('Your cart is empty!', 'error');
      return;
    }
    navigate('/checkout');
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="star filled">★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="star half">★</span>);
      } else {
        stars.push(<span key={i} className="star">★</span>);
      }
    }
    return stars;
  };

  // Render sidebar
  const renderSidebar = () => (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand" onClick={() => navigate('/')}>
          <span className="brand-icon">🌾</span>
          {!sidebarCollapsed && <span className="brand-text">Annam</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          {!sidebarCollapsed && <span className="nav-label">Home</span>}
        </div>

        <div
          className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <span className="nav-icon">🛒</span>
          {!sidebarCollapsed && <span className="nav-label">Browse</span>}
        </div>

        <div
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="nav-icon">📦</span>
          {!sidebarCollapsed && <span className="nav-label">My Orders</span>}
          {orders.filter(o => o.status !== 'delivered').length > 0 && (
            <span className="nav-badge">{orders.filter(o => o.status !== 'delivered').length}</span>
          )}
        </div>

        <div
          className={`nav-item ${activeTab === 'wishlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('wishlist')}
        >
          <span className="nav-icon">❤️</span>
          {!sidebarCollapsed && <span className="nav-label">Wishlist</span>}
          {wishlist.length > 0 && (
            <span className="nav-badge">{wishlist.length}</span>
          )}
        </div>

        <div
          className={`nav-item ${activeTab === 'farmers' ? 'active' : ''}`}
          onClick={() => setActiveTab('farmers')}
        >
          <span className="nav-icon">🌱</span>
          {!sidebarCollapsed && <span className="nav-label">Farmers</span>}
        </div>

        <div
          className={`nav-item ${activeTab === 'deals' ? 'active' : ''}`}
          onClick={() => setActiveTab('deals')}
        >
          <span className="nav-icon">🏷️</span>
          {!sidebarCollapsed && <span className="nav-label">Deals</span>}
          <span className="nav-badge hot">Hot</span>
        </div>

        <div className="nav-divider" />

        <div
          className={`nav-item ${activeTab === 'addresses' ? 'active' : ''}`}
          onClick={() => navigate('/addresses')}
        >
          <span className="nav-icon">📍</span>
          {!sidebarCollapsed && <span className="nav-label">Addresses</span>}
        </div>

        <div
          className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => navigate('/payments')}
        >
          <span className="nav-icon">💳</span>
          {!sidebarCollapsed && <span className="nav-label">Payments</span>}
        </div>

        <div
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('/customer-settings')}
        >
          <span className="nav-icon">⚙️</span>
          {!sidebarCollapsed && <span className="nav-label">Settings</span>}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="loyalty-card">
          {!sidebarCollapsed && (
            <>
              <div className="loyalty-header">
                <span className="loyalty-icon">⭐</span>
                <span className="loyalty-title">Loyalty Points</span>
              </div>
              <div className="loyalty-points">{user?.loyalty_points || 250}</div>
              <div className="loyalty-subtitle">Redeem for discounts</div>
            </>
          )}
          {sidebarCollapsed && <span className="loyalty-icon">⭐</span>}
        </div>

        <div className="nav-item logout-item" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          {!sidebarCollapsed && <span className="nav-label">Logout</span>}
        </div>
      </div>
    </aside>
  );

  // Render header
  const renderHeader = () => (
    <header className="customer-header">
      <div className="header-left">
        <div className="search-bar" onClick={() => setShowSearch(true)}>
          <span className="search-icon">🔍</span>
          <span className="search-placeholder">Search for products, farmers...</span>
          <span className="search-shortcut">⌘K</span>
        </div>
      </div>

      <div className="header-center">
        {orders.filter(o => o.status === 'out_for_delivery').length > 0 && (
          <div className="delivery-tracker-mini" onClick={() => setActiveTab('orders')}>
            <span className="tracker-icon">🚚</span>
            <span className="tracker-text">Order on the way</span>
            <span className="tracker-dot pulse" />
          </div>
        )}
      </div>

      <div className="header-right">
        <button
          className="header-btn notification-btn"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <span>🔔</span>
          {notifications.length > 0 && (
            <span className="notification-dot">{notifications.length}</span>
          )}
        </button>

        <button
          className="header-btn cart-btn"
          onClick={() => setShowCart(true)}
        >
          <span>🛒</span>
          {getCartItemsCount() > 0 && (
            <span className="cart-count">{getCartItemsCount()}</span>
          )}
        </button>

        <div className="user-menu">
          <div className="user-avatar customer">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-address">
              📍 {user?.address?.split(',')[0] || 'Add address'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );

  // Render search modal
  const renderSearchModal = () => (
    <div className={`search-modal-overlay ${showSearch ? 'show' : ''}`} onClick={() => setShowSearch(false)}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-modal-header">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for products, farmers, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button className="search-close" onClick={() => setShowSearch(false)}>
            ESC
          </button>
        </div>

        {searchQuery && (
          <div className="search-results">
            {getFilteredProducts().slice(0, 5).map(product => (
              <div
                key={product.id}
                className="search-result-item"
                onClick={() => {
                  setShowSearch(false);
                  navigate(`/product/${product.id}`);
                }}
              >
                <img src={product.image} alt={product.title} className="result-image" />
                <div className="result-info">
                  <span className="result-title">{product.title}</span>
                  <span className="result-meta">{product.farmer_name} • {formatPrice(product.price)}/{product.unit}</span>
                </div>
              </div>
            ))}
            {getFilteredProducts().length === 0 && (
              <div className="no-results">
                <span>😕</span>
                <p>No products found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {!searchQuery && (
          <div className="search-suggestions">
            <div className="suggestion-section">
              <h4>Popular Searches</h4>
              <div className="suggestion-tags">
                {['Organic Vegetables', 'Fresh Fruits', 'Farm Milk', 'Rice', 'Mangoes'].map(tag => (
                  <button
                    key={tag}
                    className="suggestion-tag"
                    onClick={() => setSearchQuery(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="suggestion-section">
              <h4>Categories</h4>
              <div className="suggestion-categories">
                {categories.slice(1, 5).map(cat => (
                  <button
                    key={cat.id}
                    className="suggestion-category"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setShowSearch(false);
                      setActiveTab('browse');
                    }}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render cart sidebar
  const renderCartSidebar = () => (
    <div className={`cart-overlay ${showCart ? 'show' : ''}`}>
      <div className="cart-backdrop" onClick={() => setShowCart(false)} />
      <div className="cart-sidebar" ref={cartRef}>
        <div className="cart-header">
          <h2>Your Cart</h2>
          <span className="cart-item-count">{getCartItemsCount()} items</span>
          <button className="cart-close" onClick={() => setShowCart(false)}>✕</button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <span className="empty-icon">🛒</span>
            <h3>Your cart is empty</h3>
            <p>Add some fresh products to get started!</p>
            <button className="btn-primary" onClick={() => { setShowCart(false); setActiveTab('browse'); }}>
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.product.id} className="cart-item">
                  <img src={item.product.image} alt={item.product.title} className="cart-item-image" />
                  <div className="cart-item-info">
                    <h4>{item.product.title}</h4>
                    <span className="cart-item-farmer">{item.product.farmer_name}</span>
                    <span className="cart-item-price">
                      {formatPrice(item.product.price)}/{item.product.unit}
                    </span>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}>+</button>
                    </div>
                    <span className="cart-item-total">{formatPrice(item.product.price * item.quantity)}</span>
                    <button className="remove-btn" onClick={() => removeFromCart(item.product.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(getCartTotal())}</span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span className="free-delivery">FREE</span>
              </div>
              <div className="summary-row discount">
                <span>🎉 First order discount</span>
                <span>-{formatPrice(getCartTotal() * 0.1)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatPrice(getCartTotal() * 0.9)}</span>
              </div>

              <button className="checkout-btn" onClick={handleCheckout}>
                <span>Proceed to Checkout</span>
                <span className="checkout-arrow">→</span>
              </button>

              <div className="cart-footer-note">
                <span>🌿</span>
                <span>You're supporting local farmers with this purchase!</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Render home tab content
  const renderHomeContent = () => (
    <div className="home-content">
      {/* Welcome Banner */}
      <section className="welcome-banner">
        <div className="welcome-content">
          <span className="welcome-badge">🌾 Fresh from Farm</span>
          <h1>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, 
            <span className="gradient-text"> {user?.name?.split(' ')[0]}!</span>
          </h1>
          <p>Discover fresh, locally sourced produce delivered straight to your doorstep.</p>
          <div className="welcome-actions">
            <button className="btn-primary" onClick={() => setActiveTab('browse')}>
              <span>Start Shopping</span>
              <span>→</span>
            </button>
            <button className="btn-secondary" onClick={() => setActiveTab('deals')}>
              <span>🏷️</span>
              <span>View Today's Deals</span>
            </button>
          </div>
        </div>
        <div className="welcome-visual">
          <div className="floating-items">
            <span className="floating-item" style={{ animationDelay: '0s' }}>🥕</span>
            <span className="floating-item" style={{ animationDelay: '0.5s' }}>🍎</span>
            <span className="floating-item" style={{ animationDelay: '1s' }}>🥬</span>
            <span className="floating-item" style={{ animationDelay: '1.5s' }}>🍇</span>
          </div>
        </div>
      </section>

      {/* Active Order Tracker */}
      {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length > 0 && (
        <section className="active-order-section">
          <div className="section-header">
            <h2>📦 Active Orders</h2>
          </div>
          <div className="active-orders">
            {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
              <div key={order.id} className="order-tracker-card">
                <div className="order-status-visual">
                  <div className={`status-step ${['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'].indexOf(order.status) >= 0 ? 'active' : ''}`}>
                    <span className="step-icon">✓</span>
                    <span className="step-label">Confirmed</span>
                  </div>
                  <div className={`status-step ${['preparing', 'out_for_delivery', 'delivered'].indexOf(order.status) >= 0 ? 'active' : ''}`}>
                    <span className="step-icon">📦</span>
                    <span className="step-label">Preparing</span>
                  </div>
                  <div className={`status-step ${['out_for_delivery', 'delivered'].indexOf(order.status) >= 0 ? 'active' : ''}`}>
                    <span className="step-icon">🚚</span>
                    <span className="step-label">On the way</span>
                  </div>
                  <div className={`status-step ${order.status === 'delivered' ? 'active' : ''}`}>
                    <span className="step-icon">🏠</span>
                    <span className="step-label">Delivered</span>
                  </div>
                </div>
                <div className="order-info">
                  <div className="order-id">Order #{order.id}</div>
                  <div className="order-eta">
                    {order.status === 'out_for_delivery' ? (
                      <>
                        <span className="eta-icon">🕐</span>
                        <span>{order.estimated_delivery}</span>
                      </>
                    ) : (
                      <span>{order.status.replace('_', ' ')}</span>
                    )}
                  </div>
                  {order.driver_name && (
                    <div className="driver-info">
                      <span className="driver-avatar">🚴</span>
                      <span>{order.driver_name}</span>
                      <button className="call-btn">📞</button>
                    </div>
                  )}
                </div>
                <button className="track-btn" onClick={() => navigate(`/track-order/${order.id}`)}>
                  Track Order →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Categories */}
      <section className="categories-section">
        <div className="section-header">
          <h2>Shop by Category</h2>
          <button className="see-all-btn" onClick={() => setActiveTab('browse')}>See All →</button>
        </div>
        <div className="categories-grid">
          {categories.map(category => (
            <div
              key={category.id}
              className={`category-card ${activeCategory === category.id ? 'active' : ''}`}
              style={{ '--category-color': category.color } as React.CSSProperties}
              onClick={() => {
                setActiveCategory(category.id);
                setActiveTab('browse');
              }}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
              <span className="category-count">{category.count} items</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="section-header">
          <h2>🌟 Featured Products</h2>
          <button className="see-all-btn" onClick={() => setActiveTab('browse')}>See All →</button>
        </div>
        <div className="products-carousel">
          {featuredProducts.map(product => (
            <div key={product.id} className="product-card featured">
              <div className="product-image-wrapper">
                <img src={product.image} alt={product.title} />
                {product.discount_percentage && (
                  <span className="discount-badge">-{product.discount_percentage}%</span>
                )}
                {product.organic && <span className="organic-badge">🌿 Organic</span>}
                <button
                  className={`wishlist-btn ${wishlist.includes(product.id) ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
                >
                  {wishlist.includes(product.id) ? '❤️' : '🤍'}
                </button>
              </div>
              <div className="product-info">
                <div className="product-farmer">
                  <span className="farmer-avatar">👨‍🌾</span>
                  <span>{product.farmer_name}</span>
                  <span className="farmer-rating">⭐ {product.farmer_rating}</span>
                </div>
                <h3 className="product-title">{product.title}</h3>
                <div className="product-meta">
                  <span className="product-location">📍 {product.location}</span>
                  <span className="product-distance">{product.distance}</span>
                </div>
                <div className="product-rating">
                  <span className="stars">{renderStars(product.rating || 0)}</span>
                  <span className="reviews">({product.reviews_count})</span>
                </div>
                <div className="product-price-row">
                  <div className="price-group">
                    <span className="current-price">{formatPrice(product.price)}</span>
                    <span className="price-unit">/{product.unit}</span>
                    {product.original_price && (
                      <span className="original-price">{formatPrice(product.original_price)}</span>
                    )}
                  </div>
                  <button
                    className="add-to-cart-btn"
                    onClick={() => addToCart(product)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Special Offers Banner */}
      <section className="offers-banner">
        <div className="offer-card primary">
          <div className="offer-content">
            <span className="offer-tag">Limited Time</span>
            <h3>First Order Special</h3>
            <p>Get 20% off on your first order!</p>
            <span className="offer-code">Use code: FRESH20</span>
          </div>
          <div className="offer-visual">🎉</div>
        </div>
        <div className="offer-card secondary">
          <div className="offer-content">
            <span className="offer-tag">Free Delivery</span>
            <h3>Orders above ₹500</h3>
            <p>No delivery charges on bulk orders</p>
          </div>
          <div className="offer-visual">🚚</div>
        </div>
      </section>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="recently-viewed-section">
          <div className="section-header">
            <h2>🕐 Recently Viewed</h2>
            <button className="clear-btn" onClick={() => setRecentlyViewed([])}>Clear</button>
          </div>
          <div className="products-row">
            {recentlyViewed.map(product => (
              <div key={product.id} className="product-card mini">
                <img src={product.image} alt={product.title} />
                <div className="product-info">
                  <h4>{product.title}</h4>
                  <span>{formatPrice(product.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="features-section">
        <div className="section-header">
          <h2>Why Choose Annam?</h2>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🌱</span>
            <h4>Farm Fresh</h4>
            <p>Directly sourced from local farmers, delivered within 24 hours</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">✓</span>
            <h4>Quality Assured</h4>
            <p>Every product is checked for freshness and quality</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">💰</span>
            <h4>Best Prices</h4>
            <p>No middlemen means better prices for you and farmers</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🚚</span>
            <h4>Quick Delivery</h4>
            <p>Same day or next day delivery to your doorstep</p>
          </div>
        </div>
      </section>
    </div>
  );

  // Render browse tab content
  const renderBrowseContent = () => {
    const filteredProducts = getFilteredProducts();

    return (
      <div className="browse-content">
        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-filter-btn ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
                <span className="count">({category.count})</span>
              </button>
            ))}
          </div>

          <div className="sort-filter">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Rating</option>
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="results-header">
          <span className="results-count">
            {filteredProducts.length} products found
            {activeCategory !== 'all' && ` in ${categories.find(c => c.id === activeCategory)?.name}`}
            {searchQuery && ` for "${searchQuery}"`}
          </span>
          {(activeCategory !== 'all' || searchQuery) && (
            <button
              className="clear-filters-btn"
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
            >
              Clear Filters ✕
            </button>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading fresh products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No products found</h3>
            <p>Try adjusting your filters or search terms</p>
            <button className="btn-primary" onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}>
              Browse All Products
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="product-card"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="product-image-wrapper">
                  <img src={product.image} alt={product.title} loading="lazy" />
                  {product.discount_percentage && (
                    <span className="discount-badge">-{product.discount_percentage}%</span>
                  )}
                  {product.organic && <span className="organic-badge">🌿</span>}
                  <button
                    className={`wishlist-btn ${wishlist.includes(product.id) ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
                  >
                    {wishlist.includes(product.id) ? '❤️' : '🤍'}
                  </button>
                  <div className="quick-add-overlay">
                    <button
                      className="quick-add-btn"
                      onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
                <div className="product-info">
                  <div className="product-farmer">
                    <span>{product.farmer_name}</span>
                    {product.farmer_rating && <span className="rating">⭐ {product.farmer_rating}</span>}
                  </div>
                  <h3 className="product-title">{product.title}</h3>
                  {product.tags && (
                    <div className="product-tags">
                      {product.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="product-footer">
                    <div className="price-group">
                      <span className="current-price">{formatPrice(product.price)}</span>
                      <span className="price-unit">/{product.unit}</span>
                      {product.original_price && (
                        <span className="original-price">{formatPrice(product.original_price)}</span>
                      )}
                    </div>
                    <div className="product-stats">
                      {product.rating && (
                        <span className="rating">⭐ {product.rating}</span>
                      )}
                      {product.sold_count && (
                        <span className="sold">{product.sold_count}+ sold</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render orders tab content
  const renderOrdersContent = () => (
    <div className="orders-content">
      <div className="section-header">
        <h2>My Orders</h2>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <h3>No orders yet</h3>
          <p>Start shopping to see your orders here!</p>
          <button className="btn-primary" onClick={() => setActiveTab('browse')}>
            Browse Products
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className={`order-card ${order.status}`}>
              <div className="order-header">
                <div className="order-id-group">
                  <span className="order-id">Order #{order.id}</span>
                  <span className="order-date">{getTimeAgo(order.created_at)}</span>
                </div>
                <span className={`order-status ${order.status}`}>
                  {order.status === 'out_for_delivery' ? '🚚 On the way' :
                   order.status === 'delivered' ? '✅ Delivered' :
                   order.status === 'preparing' ? '📦 Preparing' :
                   order.status === 'confirmed' ? '✓ Confirmed' :
                   order.status === 'cancelled' ? '✕ Cancelled' :
                   '⏳ Pending'}
                </span>
              </div>

              <div className="order-items-preview">
                {order.items.slice(0, 3).map(item => (
                  <div key={item.product.id} className="order-item-mini">
                    <img src={item.product.image} alt={item.product.title} />
                    <span className="item-quantity">×{item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="more-items">+{order.items.length - 3}</div>
                )}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <span className="label">Total:</span>
                  <span className="amount">{formatPrice(order.total)}</span>
                </div>
                <div className="order-actions">
                  {order.status === 'out_for_delivery' && (
                    <button
                      className="btn-primary"
                      onClick={() => navigate(`/track-order/${order.id}`)}
                    >
                      Track Order
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button className="btn-secondary">Reorder</button>
                  )}
                  <button className="btn-text">View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render wishlist tab content
  const renderWishlistContent = () => {
    const wishlistProducts = products.filter(p => wishlist.includes(p.id));

    return (
      <div className="wishlist-content">
        <div className="section-header">
          <h2>❤️ My Wishlist</h2>
          <span className="wishlist-count">{wishlistProducts.length} items</span>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">❤️</span>
            <h3>Your wishlist is empty</h3>
            <p>Save products you love for later!</p>
            <button className="btn-primary" onClick={() => setActiveTab('browse')}>
              Browse Products
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {wishlistProducts.map(product => (
              <div key={product.id} className="product-card wishlist-card">
                <div className="product-image-wrapper">
                  <img src={product.image} alt={product.title} />
                  <button
                    className="wishlist-btn active"
                    onClick={() => toggleWishlist(product.id)}
                  >
                    ❤️
                  </button>
                </div>
                <div className="product-info">
                  <h3>{product.title}</h3>
                  <span className="farmer">{product.farmer_name}</span>
                  <div className="price-row">
                    <span className="price">{formatPrice(product.price)}/{product.unit}</span>
                    <button
                      className="add-btn"
                      onClick={() => addToCart(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render deals tab content
  const renderDealsContent = () => {
    const dealProducts = products.filter(p => p.discount_percentage && p.discount_percentage > 0);

    return (
      <div className="deals-content">
        <div className="deals-banner">
          <div className="banner-content">
            <span className="banner-badge">🔥 Hot Deals</span>
            <h1>Today's Best Offers</h1>
            <p>Fresh savings on farm-fresh products!</p>
          </div>
          <div className="banner-timer">
            <span className="timer-label">Ends in:</span>
            <div className="timer-digits">
              <span className="digit">05</span>
              <span className="separator">:</span>
              <span className="digit">23</span>
              <span className="separator">:</span>
              <span className="digit">47</span>
            </div>
          </div>
        </div>

        {dealProducts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏷️</span>
            <h3>No deals available right now</h3>
            <p>Check back later for amazing offers!</p>
          </div>
        ) : (
          <div className="deals-grid">
            {dealProducts.map(product => (
              <div key={product.id} className="deal-card">
                <div className="deal-image">
                  <img src={product.image} alt={product.title} />
                  <span className="deal-badge">-{product.discount_percentage}%</span>
                </div>
                <div className="deal-info">
                  <h3>{product.title}</h3>
                  <span className="farmer">{product.farmer_name}</span>
                  <div className="deal-prices">
                    <span className="deal-price">{formatPrice(product.price)}</span>
                    <span className="original">{formatPrice(product.original_price || 0)}</span>
                    <span className="savings">Save {formatPrice((product.original_price || 0) - product.price)}</span>
                  </div>
                  <button className="add-btn" onClick={() => addToCart(product)}>
                    🛒 Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'browse':
        return renderBrowseContent();
      case 'orders':
        return renderOrdersContent();
      case 'wishlist':
        return renderWishlistContent();
      case 'deals':
        return renderDealsContent();
      default:
        return renderHomeContent();
    }
  };

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="customer-app">
      {renderSidebar()}
      
      <main className="customer-main">
        {renderHeader()}
        <div className="content-area">
          {renderContent()}
        </div>
      </main>

      {renderSearchModal()}
      {renderCartSidebar()}

      {/* Toast Container */}
      <div id="toast-container" />
    </div>
  );
};

export default CustomerHomePage;