// PURPLE MARTINI | WHITE & PURPLE PHONE DIGITAL MENU
import { menuItems as defaultMenuItems, categories } from './data/menuData.js';
import { translations } from './data/translations.js';
import { getLocalDishes } from './supabase.js';

const langNamesMap = {
  en: 'English',
  hi: 'हिंदी',
  pa: 'ਪੰਜਾਬੀ',
  ru: 'Русский',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  de: 'Deutsch',
  pt: 'Português'
};

// Application State
const state = {
  currentLanguage: 'en',
  currentCategory: 'all',
  searchQuery: '',
  priceFilter: 'all',
  vegOnlyFilter: false,
  dietaryFilters: {
    veg: false,
    nonveg: false,
    jain: false,
    glutenFree: false,
    highProtein: false
  },
  cart: [],
  appliedPromo: null,
  activeReviewDishId: null,
  activeDetailsDishId: null,
  selectedStarRating: 5,
  reviewsData: {},
  a11y: {
    fontSize: 'normal',
    highContrast: false,
    dyslexicFont: false,
    reducedMotion: false,
    colorblind: false
  },
  splitBill: {
    dinersCount: 2
  }
};

// INITIALIZE APP
document.addEventListener('DOMContentLoaded', () => {
  initReviewsStorage();
  initTopBarControls();
  initLanguageModal();
  initCategories();
  initSearchAndFilters();
  initAccessibilitySuite();
  initSplitBillCalculator();
  initCartAndDrawers();
  initMacrosModal();
  initDishDetailsModal();
  initStarPicker();
  loadDealsBanner();
  renderMenu();
  updateCartUI();

  // Storage listener for real-time updates from owner admin dashboard
  window.addEventListener('storage', (e) => {
    if (e.key === 'purple_martini_custom_menu') {
      renderMenu();
    } else if (e.key === 'purple_martini_deals_config') {
      loadDealsBanner();
    }
  });
});

/* ==========================================================
   1. TOP BAR CONTROLS
   ========================================================== */
function initTopBarControls() {
  const btnA11y = document.getElementById('btn-a11y-top');
  const btnSplit = document.getElementById('btn-split-top');
  const btnLang = document.getElementById('btn-lang-top');

  const drawerA11y = document.getElementById('drawer-a11y');
  const modalSplit = document.getElementById('modal-split-bill');
  const modalLang = document.getElementById('modal-language');

  if (btnA11y && drawerA11y) {
    btnA11y.addEventListener('click', () => drawerA11y.classList.remove('hidden'));
  }

  if (btnSplit && modalSplit) {
    btnSplit.addEventListener('click', () => {
      updateSplitBillDisplay();
      modalSplit.classList.remove('hidden');
    });
  }

  if (btnLang && modalLang) {
    btnLang.addEventListener('click', () => modalLang.classList.remove('hidden'));
  }
}

/* ==========================================================
   2. INTERACTIVE LANGUAGE SELECTOR MODAL
   ========================================================== */
function initLanguageModal() {
  const modal = document.getElementById('modal-language');
  const btnClose = document.getElementById('btn-close-lang');
  const langBtns = document.querySelectorAll('.lang-card-btn');
  const langLabel = document.getElementById('current-lang-label');

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedCode = btn.getAttribute('data-lang-code');
      langBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.currentLanguage = selectedCode;
      if (langLabel) langLabel.textContent = langNamesMap[selectedCode] || 'Language';

      updateStaticTranslations();
      initCategories();
      renderMenu();

      if (modal) modal.classList.add('hidden');
    });
  });
}

function updateStaticTranslations() {
  const dict = translations[state.currentLanguage] || translations.en;
  Object.keys(dict).forEach(key => {
    const el = document.getElementById(key);
    if (el) el.textContent = dict[key];
  });
}

/* ==========================================================
   3. DEALS BANNER ENGINE
   ========================================================== */
function loadDealsBanner() {
  const section = document.getElementById('deal-banner-section');
  const tagEl = document.getElementById('deal-banner-tag');
  const textEl = document.getElementById('deal-banner-text');

  const savedDeals = localStorage.getItem('purple_martini_deals_config');
  if (savedDeals) {
    try {
      const deal = JSON.parse(savedDeals);
      if (deal.active === false) {
        if (section) section.classList.add('hidden');
        return;
      }
      if (section) section.classList.remove('hidden');
      if (tagEl) tagEl.textContent = deal.tag || '🔥 SUNSET HAPPY HOUR';
      if (textEl) {
        textEl.innerHTML = `${deal.desc || 'Get discount on Cocktails & Tapas!'} Code: <strong class="code-box" id="deal-banner-code">${deal.code || 'HAPPY20'}</strong>`;
      }
    } catch (e) {}
  }
}

/* ==========================================================
   4. MENU DATA & RENDERING ENGINE
   ========================================================== */
function getActiveDishes() {
  const custom = getLocalDishes();
  return custom.length > 0 ? custom : defaultMenuItems;
}

function renderMenu() {
  const menuGrid = document.getElementById('menu-grid');
  const emptyState = document.getElementById('empty-state');
  if (!menuGrid) return;

  const allDishes = getActiveDishes();
  const lang = state.currentLanguage;

  const filtered = allDishes.filter(dish => {
    // 1. Category Filter (Case-insensitive trimmed comparison)
    if (state.currentCategory !== 'all' && (dish.category || '').toLowerCase().trim() !== state.currentCategory.toLowerCase().trim()) {
      return false;
    }

    // 2. Veg Filter (Toggle or Chip)
    if ((state.vegOnlyFilter || state.dietaryFilters.veg) && !dish.isVeg) {
      return false;
    }

    // 3. Non-Veg Filter
    if (state.dietaryFilters.nonveg && dish.isVeg) {
      return false;
    }

    // 4. Price Filter
    const price = Number(dish.price) || 0;
    if (state.priceFilter === '500' && price > 500) return false;
    if (state.priceFilter === '700' && price > 700) return false;

    // 5. Special Dietary Filters
    if (state.dietaryFilters.jain && !dish.isJain) return false;
    if (state.dietaryFilters.glutenFree && !dish.isGlutenFree) return false;
    if (state.dietaryFilters.highProtein && !dish.isHighProtein) return false;

    // 6. Multilingual & Cross-Language Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      const lang = state.currentLanguage;

      const nameCurrent = typeof dish.name === 'object' ? (dish.name[lang] || '') : String(dish.name || '');
      const nameEn = typeof dish.name === 'object' ? (dish.name.en || '') : String(dish.name || '');
      const descCurrent = typeof dish.description === 'object' ? (dish.description[lang] || '') : String(dish.description || '');
      const descEn = typeof dish.description === 'object' ? (dish.description.en || '') : String(dish.description || '');
      const catTxt = String(dish.category || '');

      const fullStr = `${nameCurrent} ${nameEn} ${descCurrent} ${descEn} ${catTxt}`.toLowerCase();
      if (!fullStr.includes(q)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    menuGrid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  } else {
    if (emptyState) emptyState.classList.add('hidden');
  }

  menuGrid.innerHTML = filtered.map(dish => {
    const dishName = typeof dish.name === 'object' ? (dish.name[lang] || dish.name.en) : dish.name;
    const dishDesc = typeof dish.description === 'object' ? (dish.description[lang] || dish.description.en) : dish.description;
    const isVeg = dish.isVeg;
    const dotIcon = isVeg ? '🟢' : '🔴';
    const isAvailable = dish.isAvailable !== false;

    const cartItem = state.cart.find(ci => ci.dishId === dish.id);
    const cartQty = cartItem ? cartItem.quantity : 0;
    const macros = dish.macros || { calories: 350, protein: 15, carbs: 30, fats: 12, fiber: 4, sodium: 450 };

    return `
      <div class="air-dish-card ${!isAvailable ? 'out-of-stock' : ''}" data-dish-id="${dish.id}">
        <div class="air-dish-left" onclick="window.openDishDetailsModal('${dish.id}')">
          <div class="air-dish-title-row">
            <span class="diet-dot-icon">${dotIcon}</span>
            <h3 class="air-dish-name">${dishName}</h3>
          </div>

          <div class="air-dish-price">₹${dish.price}</div>
          <div class="air-dish-desc">${dishDesc}</div>

          <div class="air-macros-strip">
            <span class="macro-badge">🔥 ${macros.calories} kcal</span>
            <span class="macro-badge">💪 ${macros.protein}g Protein</span>
            ${dish.isGlutenFree ? '<span class="macro-badge">🌾 GF</span>' : ''}
            ${dish.isJain ? '<span class="macro-badge">🛕 Jain</span>' : ''}
          </div>

          <div class="air-dish-actions">
            <button class="btn-view-details" onclick="event.stopPropagation(); window.openDishDetailsModal('${dish.id}')">
              📖 Full Details & Macros
            </button>
            <button class="btn-audio-speak" onclick="event.stopPropagation(); window.readDishAudio('${dish.id}')">
              🔊 Listen
            </button>
            <button class="btn-reviews-link" onclick="event.stopPropagation(); window.openReviewsModal('${dish.id}')">
              ★ ${dish.rating || 4.8} (${dish.reviewsCount || 12})
            </button>
          </div>
        </div>

        <div class="air-dish-right">
          <img src="${dish.image}" alt="${dishName}" class="air-dish-img" onclick="window.openDishDetailsModal('${dish.id}')" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'">
          
          <div class="air-floating-add-container">
            ${!isAvailable ? `
              <span class="air-out-stock-badge">Sold Out</span>
            ` : cartQty === 0 ? `
              <button class="air-add-btn" onclick="event.stopPropagation(); window.updateCartItemQuantity('${dish.id}', 1)">ADD</button>
            ` : `
              <div class="air-stepper">
                <button class="air-stepper-btn" onclick="event.stopPropagation(); window.updateCartItemQuantity('${dish.id}', ${cartQty - 1})">-</button>
                <span class="air-stepper-qty">${cartQty}</span>
                <button class="air-stepper-btn" onclick="event.stopPropagation(); window.updateCartItemQuantity('${dish.id}', ${cartQty + 1})">+</button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================
   5. DISH DETAILS MODAL (WHOLE INFORMATION VIEW)
   ========================================================== */
function initDishDetailsModal() {
  const modal = document.getElementById('modal-dish-details');
  const btnClose = document.getElementById('btn-close-details');
  const btnRatingForm = document.getElementById('btn-open-rating-form');

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (btnRatingForm) {
    btnRatingForm.addEventListener('click', () => {
      if (state.activeDetailsDishId) {
        window.openReviewsModal(state.activeDetailsDishId);
      }
    });
  }
}

window.openDishDetailsModal = function(dishId) {
  state.activeDetailsDishId = dishId;
  const modal = document.getElementById('modal-dish-details');
  if (!modal) return;

  const dishes = getActiveDishes();
  const dish = dishes.find(d => String(d.id) === String(dishId));
  if (!dish) return;

  const lang = state.currentLanguage;
  const dishName = typeof dish.name === 'object' ? (dish.name[lang] || dish.name.en) : dish.name;
  const dishDesc = typeof dish.description === 'object' ? (dish.description[lang] || dish.description.en) : dish.description;

  document.getElementById('details-dish-name').textContent = dishName;
  document.getElementById('details-dish-category').textContent = (dish.category || 'menu').toUpperCase();
  document.getElementById('details-dish-img').src = dish.image;
  document.getElementById('details-dish-price').textContent = `₹${dish.price}`;
  document.getElementById('details-diet-badge').textContent = dish.isVeg ? '🌱 Vegetarian' : '🍗 Non-Vegetarian';
  document.getElementById('details-dish-desc').textContent = dishDesc;

  const btnAudio = document.getElementById('btn-details-audio');
  if (btnAudio) {
    btnAudio.onclick = () => window.readDishAudio(dish.id);
  }

  // Populate Macros Table inside details
  const tbody = document.getElementById('details-macros-tbody');
  const m = dish.macros || { calories: 350, protein: 15, carbs: 30, fats: 12, fiber: 4, sodium: 450 };

  const rows = [
    { name: 'Calories (Energy)', value: `${m.calories} kcal`, dv: `${Math.round((m.calories / 2000) * 100)}%` },
    { name: 'Protein', value: `${m.protein} g`, dv: `${Math.round((m.protein / 50) * 100)}%` },
    { name: 'Total Carbohydrates', value: `${m.carbs} g`, dv: `${Math.round((m.carbs / 275) * 100)}%` },
    { name: 'Total Fats', value: `${m.fats} g`, dv: `${Math.round((m.fats / 78) * 100)}%` },
    { name: 'Dietary Fiber', value: `${m.fiber || 4} g`, dv: `${Math.round(((m.fiber || 4) / 28) * 100)}%` },
    { name: 'Sodium', value: `${m.sodium || 450} mg`, dv: `${Math.round(((m.sodium || 450) / 2300) * 100)}%` }
  ];

  if (tbody) {
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.value}</td>
        <td><span class="macro-badge">${r.dv} DV</span></td>
      </tr>
    `).join('');
  }

  // Populate Reviews list inside details
  const reviewsListEl = document.getElementById('details-reviews-list');
  const dishReviews = state.reviewsData[dishId] || [
    { name: 'Aarav Mehta', rating: 5, comment: 'Absolute perfection! Great taste and ambiance.', date: 'Yesterday' }
  ];

  if (reviewsListEl) {
    reviewsListEl.innerHTML = dishReviews.map(r => `
      <div class="cart-item-row m-b-20" style="flex-direction:column; align-items:flex-start;">
        <div class="flex-between w-full">
          <strong>${r.name}</strong>
          <span style="color:var(--primary-purple)">${'★'.repeat(r.rating)}</span>
        </div>
        <p style="font-size:0.82rem; margin-top:4px; color:var(--purple-dark-text);">${r.comment}</p>
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
};

/* ==========================================================
   6. COMPLETE NUTRITIONAL MACROS TABLE MODAL
   ========================================================== */
function initMacrosModal() {
  const modal = document.getElementById('modal-macros');
  const btnClose = document.getElementById('btn-close-macros');

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }
}

window.openMacrosModal = function(dishId) {
  state.activeMacrosDishId = dishId;
  const modal = document.getElementById('modal-macros');
  const titleEl = document.getElementById('macros-dish-title');
  const categoryEl = document.getElementById('macros-dish-category');
  const tableBody = document.getElementById('macros-table-body');
  const badgesGrid = document.getElementById('macros-dietary-badges');

  const dishes = getActiveDishes();
  const dish = dishes.find(d => String(d.id) === String(dishId));
  if (!dish) return;

  const lang = state.currentLanguage;
  const dishName = typeof dish.name === 'object' ? (dish.name[lang] || dish.name.en) : dish.name;
  if (titleEl) titleEl.textContent = `📊 Nutrition: ${dishName}`;
  if (categoryEl) categoryEl.textContent = `Serving Size: 1 Portion | Category: ${dish.category.toUpperCase()}`;

  const m = dish.macros || { calories: 350, protein: 15, carbs: 30, fats: 12, fiber: 4, sodium: 450 };

  const rows = [
    { name: 'Calories (Energy)', value: `${m.calories} kcal`, dv: `${Math.round((m.calories / 2000) * 100)}%` },
    { name: 'Protein', value: `${m.protein} g`, dv: `${Math.round((m.protein / 50) * 100)}%` },
    { name: 'Total Carbohydrates', value: `${m.carbs} g`, dv: `${Math.round((m.carbs / 275) * 100)}%` },
    { name: 'Total Fats', value: `${m.fats} g`, dv: `${Math.round((m.fats / 78) * 100)}%` },
    { name: 'Dietary Fiber', value: `${m.fiber || 4} g`, dv: `${Math.round(((m.fiber || 4) / 28) * 100)}%` },
    { name: 'Sodium', value: `${m.sodium || 450} mg`, dv: `${Math.round(((m.sodium || 450) / 2300) * 100)}%` }
  ];

  if (tableBody) {
    tableBody.innerHTML = rows.map(r => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.value}</td>
        <td><span class="macro-badge">${r.dv} DV</span></td>
      </tr>
    `).join('');
  }

  if (badgesGrid) {
    badgesGrid.innerHTML = `
      <span class="macro-badge">${dish.isVeg ? '🌱 Vegetarian' : '🍗 Non-Vegetarian'}</span>
      ${dish.isJain ? '<span class="macro-badge">🛕 Jain Suitable</span>' : ''}
      ${dish.isGlutenFree ? '<span class="macro-badge">🌾 Gluten-Free</span>' : ''}
      ${dish.isHighProtein ? '<span class="macro-badge">💪 High Protein Rich</span>' : ''}
    `;
  }

  if (modal) modal.classList.remove('hidden');
};

/* ==========================================================
   7. CATEGORIES & FILTERS
   ========================================================== */
function initCategories() {
  const container = document.getElementById('category-tabs-container');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <button class="cat-pill-btn ${cat.id === state.currentCategory ? 'active' : ''}" data-cat-id="${cat.id}">
      ${cat.icon} ${typeof cat.name === 'object' ? (cat.name[state.currentLanguage] || cat.name.en) : cat.name}
    </button>
  `).join('');

  container.querySelectorAll('[data-cat-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-cat-id]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.getAttribute('data-cat-id');
      renderMenu();
    });
  });
}

function initSearchAndFilters() {
  const searchInput = document.getElementById('input-search');
  const clearBtn = document.getElementById('btn-clear-search');
  const vegToggle = document.getElementById('chk-veg-only');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (clearBtn) {
        clearBtn.classList.toggle('hidden', !state.searchQuery);
      }
      renderMenu();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      clearBtn.classList.add('hidden');
      renderMenu();
    });
  }

  if (vegToggle) {
    vegToggle.addEventListener('change', (e) => {
      state.vegOnlyFilter = e.target.checked;
      state.dietaryFilters.veg = e.target.checked;
      const vegChip = document.querySelector('[data-diet="veg"]');
      if (vegChip) vegChip.classList.toggle('active', e.target.checked);
      if (e.target.checked && state.dietaryFilters.nonveg) {
        state.dietaryFilters.nonveg = false;
        document.querySelector('[data-diet="nonveg"]')?.classList.remove('active');
      }
      renderMenu();
    });
  }

  document.querySelectorAll('[data-price]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-price]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.priceFilter = chip.getAttribute('data-price');
      renderMenu();
    });
  });

  document.querySelectorAll('[data-diet]').forEach(chip => {
    chip.addEventListener('click', () => {
      const diet = chip.getAttribute('data-diet');

      if (diet === 'veg') {
        state.dietaryFilters.veg = !state.dietaryFilters.veg;
        state.vegOnlyFilter = state.dietaryFilters.veg;
        if (vegToggle) vegToggle.checked = state.dietaryFilters.veg;
        if (state.dietaryFilters.veg) {
          state.dietaryFilters.nonveg = false;
          document.querySelector('[data-diet="nonveg"]')?.classList.remove('active');
        }
      } else if (diet === 'nonveg') {
        state.dietaryFilters.nonveg = !state.dietaryFilters.nonveg;
        if (state.dietaryFilters.nonveg) {
          state.dietaryFilters.veg = false;
          state.vegOnlyFilter = false;
          if (vegToggle) vegToggle.checked = false;
          document.querySelector('[data-diet="veg"]')?.classList.remove('active');
        }
      } else {
        state.dietaryFilters[diet] = !state.dietaryFilters[diet];
      }

      chip.classList.toggle('active', state.dietaryFilters[diet]);
      renderMenu();
    });
  });

  const resetBtn = document.getElementById('btn-empty-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.searchQuery = '';
      state.priceFilter = 'all';
      state.vegOnlyFilter = false;
      state.currentCategory = 'all';
      state.dietaryFilters = { veg: false, nonveg: false, jain: false, glutenFree: false, highProtein: false };

      if (searchInput) searchInput.value = '';
      if (vegToggle) vegToggle.checked = false;

      document.querySelectorAll('[data-price]').forEach(c => c.classList.remove('active'));
      document.querySelector('[data-price="all"]')?.classList.add('active');
      document.querySelectorAll('[data-diet]').forEach(c => c.classList.remove('active'));

      initCategories();
      renderMenu();
    });
  }
}

/* ==========================================================
   8. AUDIO VOICE READER
   ========================================================== */
window.readDishAudio = function(dishId) {
  const dishes = getActiveDishes();
  const dish = dishes.find(d => String(d.id) === String(dishId));
  if (!dish) return;

  const lang = state.currentLanguage;
  const name = typeof dish.name === 'object' ? (dish.name[lang] || dish.name.en) : dish.name;
  const desc = typeof dish.description === 'object' ? (dish.description[lang] || dish.description.en) : dish.description;
  const textToRead = `${name}. Price: ${dish.price} Rupees. ${desc}`;

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
};

/* ==========================================================
   9. CART & ORDER SUMMARY SYSTEM
   ========================================================== */
window.updateCartItemQuantity = function(dishId, newQty) {
  const dishes = getActiveDishes();
  const dish = dishes.find(d => String(d.id) === String(dishId));
  if (!dish) return;

  const existingIdx = state.cart.findIndex(item => String(item.dishId) === String(dishId));

  if (newQty <= 0) {
    if (existingIdx !== -1) state.cart.splice(existingIdx, 1);
  } else {
    if (existingIdx !== -1) {
      state.cart[existingIdx].quantity = newQty;
    } else {
      state.cart.push({ dishId: dish.id, quantity: newQty, dish });
    }
  }

  renderMenu();
  updateCartUI();
};

function updateCartUI() {
  const bottomBar = document.getElementById('air-bottom-bar');
  const countEl = document.getElementById('air-cart-items-count');
  const totalEl = document.getElementById('air-cart-total-price');

  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0);

  if (bottomBar) {
    if (totalItems > 0) {
      bottomBar.classList.remove('hidden');
      if (countEl) countEl.textContent = `${totalItems} ITEM${totalItems > 1 ? 'S' : ''}`;
      if (totalEl) totalEl.textContent = `₹${subtotal}`;
    } else {
      bottomBar.classList.add('hidden');
    }
  }

  renderCartDrawer();
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  const lang = state.currentLanguage;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card text-center" style="padding:30px 10px;">
        <div class="empty-icon" style="font-size:3rem; margin-bottom:10px;">🛒</div>
        <h4 style="color:var(--purple-dark-text); font-weight:700;">Your order list is empty</h4>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">Tap ADD on any dish to start building your order summary.</p>
      </div>
    `;
    updateBillSummary(0);
    return;
  }

  container.innerHTML = state.cart.map(item => {
    const dishName = typeof item.dish.name === 'object' ? (item.dish.name[lang] || item.dish.name.en) : item.dish.name;
    const itemTotal = item.dish.price * item.quantity;
    const isVeg = item.dish.isVeg;
    const dotIcon = isVeg ? '🟢' : '🔴';

    return `
      <div class="cart-item-card">
        <img src="${item.dish.image}" alt="${dishName}" class="cart-item-thumb" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'">
        
        <div class="cart-item-details">
          <div class="cart-item-title-row">
            <span class="cart-item-name-text"><span>${dotIcon}</span> ${dishName}</span>
            <span class="cart-item-total-badge">₹${itemTotal}</span>
          </div>
          <div class="cart-item-unit-price">₹${item.dish.price} each</div>
        </div>

        <div class="air-stepper">
          <button class="air-stepper-btn" onclick="window.updateCartItemQuantity('${item.dishId}', ${item.quantity - 1})">-</button>
          <span class="air-stepper-qty">${item.quantity}</span>
          <button class="air-stepper-btn" onclick="window.updateCartItemQuantity('${item.dishId}', ${item.quantity + 1})">+</button>
        </div>
      </div>
    `;
  }).join('');

  const subtotal = state.cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0);
  updateBillSummary(subtotal);
}

function updateBillSummary(subtotal) {
  const tax = Math.round(subtotal * 0.10);
  let discount = 0;

  if (state.appliedPromo === 'HAPPY20' || state.appliedPromo === 'PURPLE20') {
    discount = Math.round(subtotal * 0.20);
  }

  const grandTotal = Math.max(0, subtotal + tax - discount);

  const subtotalEl = document.getElementById('bill-subtotal');
  const taxEl = document.getElementById('bill-tax');
  const discountRow = document.getElementById('row-discount');
  const discountEl = document.getElementById('bill-discount');
  const totalEl = document.getElementById('bill-total');

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (taxEl) taxEl.textContent = `₹${tax}`;

  if (discountRow && discountEl) {
    if (discount > 0) {
      discountRow.classList.remove('hidden');
      discountEl.textContent = `-₹${discount}`;
    } else {
      discountRow.classList.add('hidden');
    }
  }

  if (totalEl) totalEl.textContent = `₹${grandTotal}`;
}

window.quickApplyPromo = function(code) {
  const inputPromo = document.getElementById('input-promo');
  const promoMsg = document.getElementById('promo-message');
  if (inputPromo) inputPromo.value = code;

  state.appliedPromo = code;
  if (promoMsg) {
    promoMsg.className = 'promo-message active m-t-10';
    promoMsg.textContent = `🎉 Promo code ${code} applied! 20% discount unlocked.`;
    promoMsg.classList.remove('hidden');
  }
  renderCartDrawer();
};

function initCartAndDrawers() {
  const cartToggleBtn = document.getElementById('btn-cart-toggle');
  const cartCloseBtn = document.getElementById('btn-close-cart');
  const cartDrawer = document.getElementById('drawer-cart');
  const btnClearCart = document.getElementById('btn-clear-cart');

  if (cartToggleBtn) {
    cartToggleBtn.addEventListener('click', () => {
      renderCartDrawer();
      if (cartDrawer) cartDrawer.classList.remove('hidden');
    });
  }

  if (cartCloseBtn) {
    cartCloseBtn.addEventListener('click', () => {
      if (cartDrawer) cartDrawer.classList.add('hidden');
    });
  }

  if (btnClearCart) {
    btnClearCart.addEventListener('click', () => {
      if (state.cart.length === 0) return;
      if (confirm("Clear all items from your order summary?")) {
        state.cart = [];
        renderMenu();
        updateCartUI();
      }
    });
  }

  const btnApplyPromo = document.getElementById('btn-apply-promo');
  const inputPromo = document.getElementById('input-promo');
  const promoMsg = document.getElementById('promo-message');

  if (btnApplyPromo && inputPromo) {
    btnApplyPromo.addEventListener('click', () => {
      const code = inputPromo.value.trim().toUpperCase();
      if (code === 'HAPPY20' || code === 'PURPLE20') {
        state.appliedPromo = code;
        promoMsg.className = 'promo-message active m-t-10';
        promoMsg.textContent = '🎉 Promo code applied! 20% discount unlocked.';
        promoMsg.classList.remove('hidden');
      } else {
        promoMsg.className = 'promo-message error m-t-10';
        promoMsg.textContent = '❌ Invalid promo code. Try HAPPY20';
        promoMsg.classList.remove('hidden');
      }
      renderCartDrawer();
    });
  }
}

/* ==========================================================
   10. REVIEWS & RATINGS SYSTEM
   ========================================================== */
function initReviewsStorage() {
  const saved = localStorage.getItem('purple_martini_reviews');
  if (saved) {
    try { state.reviewsData = JSON.parse(saved); } catch (e) {}
  }
}

function initStarPicker() {
  const starOpts = document.querySelectorAll('.star-opt');
  starOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      const val = Number(opt.getAttribute('data-val'));
      state.selectedStarRating = val;
      starOpts.forEach(s => {
        const sVal = Number(s.getAttribute('data-val'));
        s.classList.toggle('active', sVal <= val);
      });
    });
  });
}

window.openReviewsModal = function(dishId) {
  state.activeReviewDishId = dishId;
  const modal = document.getElementById('modal-reviews');
  const titleEl = document.getElementById('reviews-dish-title');
  const badgeEl = document.getElementById('reviews-dish-badge');
  const listEl = document.getElementById('reviews-list');

  const dishes = getActiveDishes();
  const dish = dishes.find(d => String(d.id) === String(dishId));
  if (!dish) return;

  const lang = state.currentLanguage;
  if (titleEl) titleEl.textContent = typeof dish.name === 'object' ? (dish.name[lang] || dish.name.en) : dish.name;
  if (badgeEl) badgeEl.textContent = `★ ${dish.rating || 4.8}`;

  const dishReviews = state.reviewsData[dishId] || [
    { name: 'Aarav Mehta', rating: 5, comment: 'Absolute perfection! Great taste and ambiance.', date: 'Yesterday' }
  ];

  if (listEl) {
    listEl.innerHTML = dishReviews.map(r => `
      <div class="cart-item-row m-b-20" style="flex-direction:column; align-items:flex-start;">
        <div class="flex-between w-full">
          <strong>${r.name}</strong>
          <span style="color:var(--primary-purple)">${'★'.repeat(r.rating)}</span>
        </div>
        <p style="font-size:0.82rem; margin-top:4px; color:var(--purple-dark-text);">${r.comment}</p>
      </div>
    `).join('');
  }

  if (modal) modal.classList.remove('hidden');
};

document.getElementById('btn-close-reviews')?.addEventListener('click', () => {
  document.getElementById('modal-reviews')?.classList.add('hidden');
});

document.getElementById('form-add-review')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const dishId = state.activeReviewDishId || state.activeDetailsDishId;
  if (!dishId) return;

  const name = document.getElementById('input-review-name').value;
  const comment = document.getElementById('input-review-text').value;
  const rating = state.selectedStarRating || 5;

  if (!state.reviewsData[dishId]) state.reviewsData[dishId] = [];
  state.reviewsData[dishId].unshift({ name, rating, comment, date: 'Just now' });

  localStorage.setItem('purple_martini_reviews', JSON.stringify(state.reviewsData));
  alert(`Thank you ${name}! Your ${rating}-star rating has been submitted.`);
  
  document.getElementById('modal-reviews')?.classList.add('hidden');
  
  if (state.activeDetailsDishId === dishId) {
    window.openDishDetailsModal(dishId);
  }
});

/* ==========================================================
   11. ACCESSIBILITY SUITE ENHANCEMENTS
   ========================================================== */
function initAccessibilitySuite() {
  const btnClose = document.getElementById('btn-close-a11y');
  const drawer = document.getElementById('drawer-a11y');
  const btnReset = document.getElementById('btn-reset-a11y');

  if (btnClose && drawer) {
    btnClose.addEventListener('click', () => drawer.classList.add('hidden'));
  }

  // Font size buttons
  document.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const size = btn.getAttribute('data-size');
      document.documentElement.setAttribute('data-font-size', size);
    });
  });

  document.getElementById('chk-high-contrast')?.addEventListener('change', (e) => {
    document.body.classList.toggle('high-contrast', e.target.checked);
  });

  document.getElementById('chk-dyslexic')?.addEventListener('change', (e) => {
    document.body.classList.toggle('dyslexic-font', e.target.checked);
  });

  document.getElementById('chk-reduced-motion')?.addEventListener('change', (e) => {
    document.body.classList.toggle('reduced-motion', e.target.checked);
  });

  document.getElementById('chk-colorblind')?.addEventListener('change', (e) => {
    document.body.classList.toggle('colorblind-mode', e.target.checked);
  });

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      document.documentElement.setAttribute('data-font-size', 'normal');
      document.body.classList.remove('high-contrast', 'dyslexic-font', 'reduced-motion', 'colorblind-mode');
      
      document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-size="normal"]')?.classList.add('active');
      
      const chks = ['chk-high-contrast', 'chk-dyslexic', 'chk-reduced-motion', 'chk-colorblind'];
      chks.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
      });

      alert("Accessibility suite reset to default values.");
    });
  }
}

/* ==========================================================
   12. EXECUTIVE SPLIT BILL SUITE LOGIC
   ========================================================== */
function initSplitBillCalculator() {
  const btnClose = document.getElementById('btn-close-split');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      document.getElementById('modal-split-bill')?.classList.add('hidden');
    });
  }

  // Split mode tabs (Equal vs Itemized)
  const modeBtns = document.querySelectorAll('.split-tab-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('split-mode-equal')?.classList.toggle('hidden', mode !== 'equal');
      document.getElementById('split-mode-itemized')?.classList.toggle('hidden', mode !== 'itemized');

      if (mode === 'itemized') {
        renderItemizedSplitView();
      } else {
        updateSplitBillDisplay();
      }
    });
  });

  const btnMinus = document.getElementById('btn-diners-minus');
  const btnPlus = document.getElementById('btn-diners-plus');
  const valDiners = document.getElementById('val-num-diners');
  const btnCopyReceipt = document.getElementById('btn-copy-receipt');
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');

  if (btnMinus) {
    btnMinus.addEventListener('click', () => {
      if (state.splitBill.dinersCount > 1) {
        state.splitBill.dinersCount--;
        if (valDiners) valDiners.textContent = state.splitBill.dinersCount;
        updateSplitBillDisplay();
      }
    });
  }

  if (btnPlus) {
    btnPlus.addEventListener('click', () => {
      state.splitBill.dinersCount++;
      if (valDiners) valDiners.textContent = state.splitBill.dinersCount;
      updateSplitBillDisplay();
    });
  }

  // Tip selection chips
  document.querySelectorAll('[data-tip]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-tip]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.splitBill.tipPercent = Number(chip.getAttribute('data-tip')) || 0;
      updateSplitBillDisplay();
    });
  });

  if (btnCopyReceipt) {
    btnCopyReceipt.addEventListener('click', () => {
      const receiptText = generateFormattedReceipt();
      navigator.clipboard?.writeText(receiptText).then(() => {
        const originalText = btnCopyReceipt.textContent;
        btnCopyReceipt.textContent = '✅ Receipt Breakdown Copied!';
        setTimeout(() => { btnCopyReceipt.textContent = originalText; }, 2500);
      }).catch(() => {
        alert(receiptText);
      });
    });
  }

  if (btnShareWhatsapp) {
    btnShareWhatsapp.addEventListener('click', () => {
      const receiptText = generateFormattedReceipt();
      const encoded = encodeURIComponent(receiptText);
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    });
  }
}

function generateFormattedReceipt() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.10);
  const discount = state.appliedPromo ? Math.round(subtotal * 0.20) : 0;
  const tipPercent = state.splitBill.tipPercent || 0;
  const tip = Math.round(subtotal * (tipPercent / 100));
  const grandTotal = Math.max(0, subtotal + tax - discount + tip);
  const dinersCount = state.splitBill.dinersCount;
  const share = dinersCount > 0 ? Math.round(grandTotal / dinersCount) : grandTotal;

  return `🍸 *PURPLE MARTINI ANJUNA GOA* 🍸\n*Executive Digital Receipt*\n\n👥 Total Diners: ${dinersCount}\n🍽️ Food & Drinks Subtotal: ₹${subtotal}\n🧾 Taxes & Service (10%): ₹${tax}\n🎉 Promo Discount: -₹${discount}\n🪙 Staff Tip (${tipPercent}%): ₹${tip}\n━━━━━━━━━━━━━━━━━━━━━\n💳 *GRAND TOTAL: ₹${grandTotal}*\n👉 *PER DINER SHARE: ₹${share}*\n━━━━━━━━━━━━━━━━━━━━━\nThank you for dining with us at Purple Martini! 🌅`;
}

function updateSplitBillDisplay() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.10);
  const discount = state.appliedPromo ? Math.round(subtotal * 0.20) : 0;
  const tipPercent = state.splitBill.tipPercent || 0;
  const tip = Math.round(subtotal * (tipPercent / 100));
  const grandTotal = Math.max(0, subtotal + tax - discount + tip);

  const dinersCount = state.splitBill.dinersCount;
  const equalShare = dinersCount > 0 ? Math.round(grandTotal / dinersCount) : grandTotal;

  const basePerPerson = dinersCount > 0 ? Math.round((subtotal - discount) / dinersCount) : 0;
  const taxPerPerson = dinersCount > 0 ? Math.round(tax / dinersCount) : 0;
  const tipPerPerson = dinersCount > 0 ? Math.round(tip / dinersCount) : 0;

  const shareEl = document.getElementById('val-equal-share');
  const baseEl = document.getElementById('split-base-person');
  const taxEl = document.getElementById('split-tax-person');
  const tipEl = document.getElementById('split-tip-person');
  const avatarsEl = document.getElementById('diner-avatars-row');

  if (shareEl) shareEl.textContent = `₹${equalShare}`;
  if (baseEl) baseEl.textContent = `₹${basePerPerson}`;
  if (taxEl) taxEl.textContent = `₹${taxPerPerson}`;
  if (tipEl) tipEl.textContent = `₹${tipPerPerson}`;

  if (avatarsEl) {
    if (dinersCount === 1) avatarsEl.textContent = '👤';
    else if (dinersCount === 2) avatarsEl.textContent = '👥';
    else if (dinersCount <= 4) avatarsEl.textContent = '👥👥';
    else avatarsEl.textContent = '👥👥👥';
  }
}

function renderItemizedSplitView() {
  const container = document.getElementById('itemized-dishes-list');
  const output = document.getElementById('itemized-breakdown-output');
  if (!container) return;

  const lang = state.currentLanguage;

  if (state.cart.length === 0) {
    container.innerHTML = `<div class="text-center p-20" style="color:#ffffff;">Your cart is empty. Add dishes to split itemized bill.</div>`;
    if (output) output.innerHTML = '';
    return;
  }

  container.innerHTML = state.cart.map((item, idx) => {
    const name = typeof item.dish.name === 'object' ? (item.dish.name[lang] || item.dish.name.en) : item.dish.name;
    const total = item.dish.price * item.quantity;
    
    return `
      <div class="itemized-dish-row">
        <div>
          <div class="itemized-dish-title">${name} (${item.quantity}x)</div>
          <div style="font-size:0.75rem; color:var(--primary-purple); font-weight:700;">₹${total}</div>
        </div>
        <div class="itemized-diner-picker">
          <span class="diner-tag-btn active">Split All</span>
        </div>
      </div>
    `;
  }).join('');

  if (output) {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0);
    const diners = state.splitBill.dinersCount;
    const perDiner = Math.round(subtotal / diners);

    output.innerHTML = `
      <div class="share-title">ITEMIZED SUMMARY (${diners} DINERS)</div>
      <div class="share-amount">₹${perDiner}</div>
      <p style="font-size:0.75rem; color:#d8b4fe;">Estimated base food share per diner before taxes</p>
    `;
  }
}
