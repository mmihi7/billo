// Data models and validation functions for Bill-O app

// Tab Model
export const TabModel = {
  // Tab statuses
  STATUS: {
    INACTIVE: 'inactive',        // Tab created but no orders yet (QR scan)
    ACTIVE: 'active',            // Tab has at least one order
    PENDING_ACCEPTANCE: 'pending_acceptance',
    BILL_ACCEPTED: 'bill_accepted',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  // Create a new tab object
  create: (data) => ({
    restaurantId: data.restaurantId || '',
    restaurantName: data.restaurantName || '',
    tableNumber: data.tableNumber || '',
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    waiterName: data.waiterName || '',
    waiterId: data.waiterId || '',
    // New tabs start as INACTIVE (will become ACTIVE when first order is placed)
    status: TabModel.STATUS.INACTIVE,
    total: 0,
    tax: 0,
    grandTotal: 0,
    referenceNumber: '',
    qrCodeData: data.qrCodeData || null,
    createdAt: null,
    updatedAt: null
  }),

  // Validate tab data
  validate: (tab) => {
    const errors = [];
    if (!tab.restaurantId) errors.push('Restaurant ID is required');
    if (!tab.tableNumber) errors.push('Tab number is required');
    if (!tab.restaurantName) errors.push('Restaurant name is required');
    
    // Waiter assignment is only required for ACTIVE tabs
    if (tab.status !== TabModel.STATUS.INACTIVE) {
      if (!tab.waiterName) errors.push('Waiter name is required for active tabs');
      if (!tab.waiterId) errors.push('Waiter ID is required for active tabs');
    }
    
    // Tabs must have a referenceNumber (tab id)
    if (!tab.referenceNumber) errors.push('Tab ID (referenceNumber) is required');
    
    // Tabs can be in pending_acceptance status if awaiting customer acceptance
    if (tab.status === TabModel.STATUS.PENDING_ACCEPTANCE && !tab.customerAccepted) {
      errors.push('Tab is pending acceptance by customer');
    }
    
    // INACTIVE tabs should have no orders
    if (tab.status === TabModel.STATUS.INACTIVE && tab.total > 0) {
      errors.push('Inactive tabs cannot have orders');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Order Model
export const OrderModel = {
  // Create a new order object
  create: (data) => ({
    tabId: data.tabId || '',
    itemName: data.itemName || '',
    price: parseFloat(data.price) || 0,
    quantity: parseInt(data.quantity) || 1,
    category: data.category || 'food',
    notes: data.notes || '',
    waiterName: data.waiterName || '',
    waiterId: data.waiterId || '',
    createdAt: null
  }),

  // Validate order data
  validate: (order) => {
    const errors = [];
    if (!order.tabId) errors.push('Tab ID is required');
    if (!order.itemName) errors.push('Item name is required');
    if (order.price <= 0) errors.push('Price must be greater than 0');
    if (order.quantity <= 0) errors.push('Quantity must be greater than 0');
    if (!order.waiterName) errors.push('Waiter name is required');
    // Orders must be initiated by waiter
    if (!order.createdBy || order.createdBy !== 'waiter') errors.push('Order must be initiated by a waiter');
    // Orders must be accepted by customer to be valid
    if (!order.customerAccepted) errors.push('Order must be accepted by customer');
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Calculate order total
  getTotal: (order) => order.price * order.quantity
}

// Payment Model
export const PaymentModel = {
  // Payment methods
  METHODS: {
    MPESA: 'mpesa',
    CASH: 'cash',
    CARD: 'card'
  },

  // Payment statuses
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  // Create a new payment object
  create: (data) => ({
    tabId: data.tabId || '',
    referenceNumber: data.referenceNumber || '',
    amount: parseFloat(data.amount) || 0,
    method: data.method || PaymentModel.METHODS.CASH,
    status: PaymentModel.STATUS.PENDING,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    transactionId: data.transactionId || '',
    mpesaCode: data.mpesaCode || '',
    notes: data.notes || '',
    createdAt: null,
    updatedAt: null
  }),

  // Validate payment data
  validate: (payment) => {
    const errors = []
    
    if (!payment.tabId) errors.push('Tab ID is required')
    if (payment.amount <= 0) errors.push('Amount must be greater than 0')
    if (!Object.values(PaymentModel.METHODS).includes(payment.method)) {
      errors.push('Invalid payment method')
    }
    
    // Method-specific validations
    if (payment.method === PaymentModel.METHODS.MPESA && !payment.customerPhone) {
      errors.push('Phone number is required for M-Pesa payments')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Restaurant Model
export const RestaurantModel = {
  // Create a new restaurant object
  create: (data) => ({
    ownerId: data.ownerId || '',
    name: data.name || '',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    taxRate: parseFloat(data.taxRate) || 0.08, // Default 8% tax
    currency: data.currency || 'USD',
    timezone: data.timezone || 'UTC',
    settings: {
      autoAcceptOrders: data.autoAcceptOrders || false,
      requireBillAcceptance: data.requireBillAcceptance || true,
      allowCashPayments: data.allowCashPayments || true,
      allowMobilePayments: data.allowMobilePayments || true
    },
    dailyTabCounter: data.dailyTabCounter || 0,
    lastTabReset: data.lastTabReset || null,
    createdAt: null,
    updatedAt: null
  }),

  // Validate restaurant data
  validate: (restaurant) => {
    const errors = []
    
    if (!restaurant.name) errors.push('Restaurant name is required')
    if (!restaurant.address) errors.push('Address is required')
    if (restaurant.taxRate < 0 || restaurant.taxRate > 1) {
      errors.push('Tax rate must be between 0 and 1')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Waiter Model
export const WaiterModel = {
  create: (data) => ({
    name: data.name || '',
    pin: data.pin || '', // 4-digit PIN for login
    restaurantId: data.restaurantId || '',
    role: 'waiter',
    createdAt: null,
    updatedAt: null
  }),

  validate: (waiter) => {
    const errors = []
    
    if (!waiter.name) errors.push('Waiter name is required')
    if (!waiter.pin || !/^\d{4}$/.test(waiter.pin)) errors.push('A 4-digit PIN is required')
    if (!waiter.restaurantId) errors.push('Restaurant ID is required')
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Menu Item Model
export const MenuItemModel = {
  // Item categories
  CATEGORIES: {
    FOOD: 'food',
    DRINKS: 'drinks',
    APPETIZERS: 'appetizers',
    DESSERTS: 'desserts',
    SPECIALS: 'specials'
  },

  // Create a new menu item object
  create: (data) => ({
    name: data.name || '',
    description: data.description || '',
    price: parseFloat(data.price) || 0,
    category: data.category || MenuItemModel.CATEGORIES.FOOD,
    available: data.available !== false, // Default to true
    imageUrl: data.imageUrl || '',
    allergens: data.allergens || [],
    preparationTime: parseInt(data.preparationTime) || 0, // in minutes
    restaurantId: data.restaurantId || '',
    createdAt: null,
    updatedAt: null
  }),

  // Validate menu item data
  validate: (item) => {
    const errors = []
    
    if (!item.name) errors.push('Item name is required')
    if (item.price <= 0) errors.push('Price must be greater than 0')
    if (!Object.values(MenuItemModel.CATEGORIES).includes(item.category)) {
      errors.push('Invalid category')
    }
    if (!item.restaurantId) errors.push('Restaurant ID is required')
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Utility functions
export const calculateTax = (amount, taxRate = 0.08) => {
  return Math.round(amount * taxRate * 100) / 100
}

export const calculateTotal = (subtotal, taxRate = 0.08) => {
  const tax = calculateTax(subtotal, taxRate)
  return Math.round((subtotal + tax) * 100) / 100
}

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export const generateReferenceNumber = (prefix = 'TAB', year = new Date().getFullYear()) => {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substr(2, 3).toUpperCase()
  return `${prefix}-${year}-${timestamp}${random}`
}

// Validation helper
export const validateModel = (model, data) => {
  if (model.validate) {
    return model.validate(data)
  }
  return { isValid: true, errors: [] }
}
