// OWNER ADMIN & DEALS MANAGER
import { getLocalDishes, saveLocalDishes } from './supabase.js';

let activeTab = 'menu';
let selectedMenuCategoryFilter = 'all';
let currentEditingDishId = null;

const DEALS_STORAGE_KEY = 'purple_martini_deals_config';

// Initialize Admin App
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMenuTab();
  initDealsTab();
  initModals();
  updateAdminStats();

  // Storage listener for real-time local sync across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'purple_martini_custom_menu') {
      renderDishes();
      updateAdminStats();
    }
  });
});

/* ==========================================================
   1. NAVIGATION & STATS COUNTERS
   ========================================================== */
function initTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.add('hidden');
      });

      const targetEl = document.getElementById(`tab-${tabTarget}`);
      if (targetEl) targetEl.classList.remove('hidden');

      activeTab = tabTarget;
      if (activeTab === 'menu') renderDishes();
    });
  });
}

function updateAdminStats() {
  const dishes = getLocalDishes();
  const totalEl = document.getElementById('stat-total-dishes');
  const inStockEl = document.getElementById('stat-instock-dishes');
  const outStockEl = document.getElementById('stat-outstock-dishes');
  const dealsStatusEl = document.getElementById('stat-deals-status');

  const inStockCount = dishes.filter(d => d.isAvailable !== false).length;
  const outStockCount = dishes.filter(d => d.isAvailable === false).length;

  if (totalEl) totalEl.textContent = dishes.length;
  if (inStockEl) inStockEl.textContent = inStockCount;
  if (outStockEl) outStockEl.textContent = outStockCount;

  const savedDeals = localStorage.getItem(DEALS_STORAGE_KEY);
  if (savedDeals && dealsStatusEl) {
    try {
      const deal = JSON.parse(savedDeals);
      dealsStatusEl.textContent = deal.active !== false ? (deal.code || 'HAPPY20') : 'Inactive';
    } catch (e) {
      dealsStatusEl.textContent = 'HAPPY20';
    }
  }
}

/* ==========================================================
   2. MENU & INVENTORY MANAGER TAB
   ========================================================== */
function initMenuTab() {
  const searchInput = document.getElementById('admin-search-dish');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderDishes());
  }

  renderCategoryChips();

  const btnAddDish = document.getElementById('btn-admin-add-dish');
  if (btnAddDish) {
    btnAddDish.addEventListener('click', () => openDishModal(null));
  }

  renderDishes();
}

function renderCategoryChips() {
  const categoryChipsContainer = document.getElementById('admin-category-chips');
  if (!categoryChipsContainer) return;

  const dishes = getLocalDishes();
  const getCount = (cat) => cat === 'all' 
    ? dishes.length 
    : dishes.filter(d => (d.category || '').toLowerCase().trim() === cat.toLowerCase().trim()).length;

  const categories = [
    { id: 'all', label: `All Items (${getCount('all')})` },
    { id: 'starters', label: `Starters (${getCount('starters')})` },
    { id: 'pizzas', label: `Pizzas (${getCount('pizzas')})` },
    { id: 'mains', label: `Mains (${getCount('mains')})` },
    { id: 'sliders', label: `Burgers (${getCount('sliders')})` },
    { id: 'desserts', label: `Desserts (${getCount('desserts')})` },
    { id: 'beverages', label: `Cocktails (${getCount('beverages')})` }
  ];

  categoryChipsContainer.innerHTML = categories.map(cat => `
    <button class="chip-btn ${cat.id === selectedMenuCategoryFilter ? 'active' : ''}" data-admin-cat="${cat.id}">
      ${cat.label}
    </button>
  `).join('');

  categoryChipsContainer.querySelectorAll('[data-admin-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMenuCategoryFilter = btn.getAttribute('data-admin-cat');
      renderDishes();
    });
  });
}

function renderDishes() {
  const dishesListEl = document.getElementById('admin-dishes-list');
  if (!dishesListEl) return;

  const dishes = getLocalDishes();
  const searchQuery = (document.getElementById('admin-search-dish')?.value || '').toLowerCase().trim();

  let filtered = dishes;
  if (selectedMenuCategoryFilter !== 'all') {
    filtered = filtered.filter(d => (d.category || '').toLowerCase().trim() === selectedMenuCategoryFilter.toLowerCase().trim());
  }
  if (searchQuery) {
    filtered = filtered.filter(d => {
      const nameTxt = typeof d.name === 'object' ? Object.values(d.name).join(' ') : String(d.name || '');
      const descTxt = typeof d.description === 'object' ? Object.values(d.description).join(' ') : String(d.description || '');
      const catTxt = String(d.category || '');
      return `${nameTxt} ${descTxt} ${catTxt}`.toLowerCase().includes(searchQuery);
    });
  }

  renderCategoryChips();

  if (filtered.length === 0) {
    dishesListEl.innerHTML = `
      <div class="empty-state-card text-center" style="padding:40px; grid-column:1/-1;">
        <div class="empty-icon" style="font-size:3rem; margin-bottom:8px;">🔍</div>
        <h3 style="color:var(--purple-dark-text); font-weight:700;">No Dishes Found</h3>
        <p style="color:var(--text-muted); font-size:0.85rem;">Try adjusting your search query or category filter.</p>
      </div>
    `;
    return;
  }

  dishesListEl.innerHTML = filtered.map(dish => {
    const isVeg = dish.isVeg;
    const dotIcon = isVeg ? '🟢' : '🔴';
    const dishName = typeof dish.name === 'object' ? dish.name.en : dish.name;
    const isAvailable = dish.isAvailable !== false;
    const macros = dish.macros || { calories: 350, protein: 15, carbs: 30, fats: 12, fiber: 4, sodium: 450 };

    return `
      <div class="admin-inventory-card ${!isAvailable ? 'out-of-stock' : ''}">
        <div class="admin-thumb-wrapper">
          <img src="${dish.image}" alt="${dishName}" class="admin-dish-thumb" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'">
          <span class="admin-cat-badge">${dish.category}</span>
        </div>
        
        <div class="admin-dish-info">
          <div class="admin-dish-title">
            <span class="diet-dot">${dotIcon}</span>
            <span class="dish-name-text"><strong>${dishName}</strong></span>
          </div>
          <div class="admin-dish-desc">${typeof dish.description === 'object' ? dish.description.en : dish.description}</div>
          <div class="admin-dish-price">₹${dish.price}</div>
          
          <div class="admin-macros-chips-row">
            <span class="mini-macro-tag">🔥 ${macros.calories} kcal</span>
            <span class="mini-macro-tag">💪 ${macros.protein}g Protein</span>
            <span class="mini-macro-tag">🌾 ${macros.carbs}g Carbs</span>
          </div>

          <div class="admin-dish-actions m-t-10">
            <button class="stock-toggle-badge ${isAvailable ? 'instock' : 'outstock'}" onclick="window.toggleDishStock('${dish.id}', ${!isAvailable})">
              ${isAvailable ? '✅ IN STOCK' : '⚠️ OUT OF STOCK'}
            </button>
            <button class="btn-edit-dish" onclick="window.editDishModal('${dish.id}')">✏️ Edit</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateAdminStats();
}

window.toggleDishStock = function(dishId, isChecked) {
  const dishes = getLocalDishes();
  const dish = dishes.find(d => String(d.id) === String(dishId));
  if (dish) {
    dish.isAvailable = isChecked;
    saveLocalDishes(dishes);
    renderDishes();
  }
};

/* ==========================================================
   3. EDIT / ADD DISH MODAL & FORM HANDLERS
   ========================================================== */
function initModals() {
  const modal = document.getElementById('modal-owner-edit');
  const btnClose = document.getElementById('btn-close-owner-edit');
  const form = document.getElementById('form-owner-edit');
  const btnDelete = document.getElementById('btn-admin-delete-dish');

  if (btnClose) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveDishForm();
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (currentEditingDishId && confirm("Are you sure you want to delete this dish from the menu?")) {
        deleteDish(currentEditingDishId);
        modal.classList.add('hidden');
      }
    });
  }
}

function openDishModal(dishId) {
  currentEditingDishId = dishId;
  const modal = document.getElementById('modal-owner-edit');
  const modalTitle = document.getElementById('modal-owner-edit-title');
  const btnDelete = document.getElementById('btn-admin-delete-dish');
  const form = document.getElementById('form-owner-edit');

  form.reset();

  if (dishId) {
    modalTitle.textContent = '✏️ Edit Dish Details & Macros Table';
    btnDelete.style.display = 'block';

    const dishes = getLocalDishes();
    const dish = dishes.find(d => String(d.id) === String(dishId));

    if (dish) {
      document.getElementById('edit-dish-id').value = dish.id;
      document.getElementById('edit-dish-name-en').value = typeof dish.name === 'object' ? dish.name.en : dish.name;
      document.getElementById('edit-dish-name-hi').value = typeof dish.name === 'object' ? (dish.name.hi || '') : '';
      document.getElementById('edit-dish-category').value = dish.category || 'starters';
      document.getElementById('edit-dish-price').value = dish.price || 0;
      document.getElementById('edit-dish-desc-en').value = typeof dish.description === 'object' ? dish.description.en : dish.description;
      document.getElementById('edit-dish-image').value = dish.image || '';
      
      document.getElementById('edit-dish-cal').value = dish.macros?.calories || 350;
      document.getElementById('edit-dish-protein').value = dish.macros?.protein || 15;
      document.getElementById('edit-dish-carbs').value = dish.macros?.carbs || 30;
      document.getElementById('edit-dish-fats').value = dish.macros?.fats || 12;
      document.getElementById('edit-dish-fiber').value = dish.macros?.fiber || 4;
      document.getElementById('edit-dish-sodium').value = dish.macros?.sodium || 450;

      document.getElementById('edit-dish-isveg').checked = !!dish.isVeg;
      document.getElementById('edit-dish-isnonveg').checked = !dish.isVeg;
      document.getElementById('edit-dish-isjain').checked = !!dish.isJain;
      document.getElementById('edit-dish-isgf').checked = !!dish.isGlutenFree;
      document.getElementById('edit-dish-isprotein').checked = !!dish.isHighProtein;
      document.getElementById('edit-dish-isavailable').checked = dish.isAvailable !== false;
    }
  } else {
    modalTitle.textContent = '✨ Add New Dish & Set Macros Table';
    btnDelete.style.display = 'none';
    document.getElementById('edit-dish-id').value = `dish-${Date.now()}`;
    document.getElementById('edit-dish-isveg').checked = true;
    document.getElementById('edit-dish-isavailable').checked = true;
  }

  modal.classList.remove('hidden');
}

window.editDishModal = function(dishId) {
  openDishModal(dishId);
};

function saveDishForm() {
  const dishes = getLocalDishes();
  const dishId = document.getElementById('edit-dish-id').value;
  const isExisting = dishes.some(d => String(d.id) === String(dishId));

  const isVeg = document.getElementById('edit-dish-isveg').checked;

  const newDish = {
    id: dishId,
    name: {
      en: document.getElementById('edit-dish-name-en').value,
      hi: document.getElementById('edit-dish-name-hi').value || document.getElementById('edit-dish-name-en').value,
      pa: document.getElementById('edit-dish-name-en').value,
      ru: document.getElementById('edit-dish-name-en').value,
      mr: document.getElementById('edit-dish-name-en').value,
      kn: document.getElementById('edit-dish-name-en').value,
      ml: document.getElementById('edit-dish-name-en').value,
      de: document.getElementById('edit-dish-name-en').value,
      pt: document.getElementById('edit-dish-name-en').value
    },
    category: document.getElementById('edit-dish-category').value,
    price: Number(document.getElementById('edit-dish-price').value),
    description: {
      en: document.getElementById('edit-dish-desc-en').value
    },
    image: document.getElementById('edit-dish-image').value,
    macros: {
      calories: Number(document.getElementById('edit-dish-cal').value) || 350,
      protein: Number(document.getElementById('edit-dish-protein').value) || 15,
      carbs: Number(document.getElementById('edit-dish-carbs').value) || 30,
      fats: Number(document.getElementById('edit-dish-fats').value) || 12,
      fiber: Number(document.getElementById('edit-dish-fiber').value) || 4,
      sodium: Number(document.getElementById('edit-dish-sodium').value) || 450
    },
    isVeg: isVeg,
    isJain: document.getElementById('edit-dish-isjain').checked,
    isGlutenFree: document.getElementById('edit-dish-isgf').checked,
    isHighProtein: document.getElementById('edit-dish-isprotein').checked,
    isAvailable: document.getElementById('edit-dish-isavailable').checked,
    rating: 4.8,
    reviewsCount: 12
  };

  if (isExisting) {
    const idx = dishes.findIndex(d => String(d.id) === String(dishId));
    dishes[idx] = { ...dishes[idx], ...newDish };
  } else {
    dishes.unshift(newDish);
  }

  saveLocalDishes(dishes);
  renderDishes();
  document.getElementById('modal-owner-edit').classList.add('hidden');
}

function deleteDish(dishId) {
  let dishes = getLocalDishes();
  dishes = dishes.filter(d => String(d.id) !== String(dishId));
  saveLocalDishes(dishes);
  renderDishes();
}

/* ==========================================================
   4. TODAY'S DEALS & HAPPY HOUR MANAGER TAB
   ========================================================== */
function initDealsTab() {
  const form = document.getElementById('form-deals-config');
  const tagInput = document.getElementById('deal-tag-input');
  const descInput = document.getElementById('deal-desc-input');
  const codeInput = document.getElementById('deal-code-input');
  const percentInput = document.getElementById('deal-percent-input');
  const activeInput = document.getElementById('deal-active-input');
  const msgEl = document.getElementById('deals-config-msg');

  const saved = localStorage.getItem(DEALS_STORAGE_KEY);
  if (saved && tagInput) {
    try {
      const deal = JSON.parse(saved);
      tagInput.value = deal.tag || '🔥 SUNSET HAPPY HOUR';
      descInput.value = deal.desc || 'Get 20% OFF on all Cocktails & Tapas!';
      codeInput.value = deal.code || 'HAPPY20';
      percentInput.value = deal.percent || 20;
      activeInput.checked = deal.active !== false;
    } catch (e) {}
  } else if (tagInput) {
    tagInput.value = '🔥 SUNSET HAPPY HOUR';
    descInput.value = 'Get 20% OFF on all Cocktails & Tapas!';
    codeInput.value = 'HAPPY20';
    percentInput.value = 20;
    activeInput.checked = true;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const config = {
        tag: tagInput.value.trim(),
        desc: descInput.value.trim(),
        code: codeInput.value.trim().toUpperCase(),
        percent: Number(percentInput.value) || 20,
        active: activeInput.checked
      };

      localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(config));
      updateAdminStats();

      if (msgEl) {
        msgEl.className = 'promo-message active m-t-10';
        msgEl.textContent = '✅ Today\'s Deal Banner updated & published live to customer menu!';
        setTimeout(() => msgEl.classList.add('hidden'), 4000);
      }
    });
  }
}
