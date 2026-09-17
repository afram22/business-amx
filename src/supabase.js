// SUPABASE REALTIME BACKEND & OFFLINE FALLBACK ENGINE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { menuItems as defaultMenuItems } from './data/menuData.js';

const CREDENTIALS_KEY = 'purple_martini_supabase_credentials';
const ORDERS_STORAGE_KEY = 'purple_martini_live_orders';
const DISHES_STORAGE_KEY = 'purple_martini_custom_menu';

// Load saved Supabase credentials if configured by owner
export function getSavedCredentials() {
  const saved = localStorage.getItem(CREDENTIALS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse Supabase credentials:", e);
    }
  }
  return { url: '', anonKey: '' };
}

export function saveCredentials(url, anonKey) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
}

// Initialize Supabase Client
let supabase = null;

export function getSupabaseClient() {
  if (supabase) return supabase;
  const { url, anonKey } = getSavedCredentials();
  if (url && anonKey) {
    try {
      supabase = createClient(url, anonKey);
      return supabase;
    } catch (e) {
      console.error("Supabase init error:", e);
    }
  }
  return null;
}

// 1. ORDERS ENGINE (Customer Submit & Real-Time Owner Listener)
export async function submitOrder(orderData) {
  const client = getSupabaseClient();
  const orderId = `PM-${Math.floor(100000 + Math.random() * 900000)}`;
  const fullOrder = {
    id: orderId,
    table_number: orderData.tableNumber || "Table #07",
    items: orderData.items,
    subtotal: orderData.subtotal,
    tax: orderData.tax,
    discount: orderData.discount || 0,
    total: orderData.total,
    notes: orderData.notes || '',
    status: 'Pending', // 'Pending' -> 'Preparing' -> 'Served' -> 'Completed'
    created_at: new Date().toISOString()
  };

  if (client) {
    try {
      const { data, error } = await client.from('orders').insert([fullOrder]);
      if (error) console.warn("Supabase insert order error, falling back to local sync:", error);
    } catch (e) {
      console.warn("Supabase order error:", e);
    }
  }

  // Always save to LocalStorage fallback for seamless sync
  const existingOrders = getLocalOrders();
  existingOrders.unshift(fullOrder);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existingOrders));

  return fullOrder;
}

export function getLocalOrders() {
  const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
}

export function updateOrderStatusLocal(orderId, newStatus) {
  const orders = getLocalOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }

  const client = getSupabaseClient();
  if (client) {
    client.from('orders').update({ status: newStatus }).eq('id', orderId).then(({ error }) => {
      if (error) console.warn("Supabase status update error:", error);
    });
  }
}

// 2. DISHES ENGINE (Fetch & Sync)
export function getLocalDishes() {
  const saved = localStorage.getItem(DISHES_STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [...defaultMenuItems];
}

export function saveLocalDishes(dishes) {
  localStorage.setItem(DISHES_STORAGE_KEY, JSON.stringify(dishes));
}
