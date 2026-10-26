const App = (() => {
    // ==========================================
    // 1. CONFIGURACIÓN Y DATOS INICIALES
    // ==========================================
    const DEFAULT_CONFIG = {
        name: "Mi Tienda White Label",
        description: "Catálogo digital con pedidos por WhatsApp",
        whatsapp: "5493537600803", // Reemplazar con número real (código país + número)
        currency: "$",
        colorPrimary: "#435d50",
        colorSecondary: "#30463a",
        fontStyle: "system",
        visualStyle: "minimal",
        version: "1.0"
    };

    const DEMO_CATEGORIES = [
        { id: "cat-1", name: "Bebidas", visible: true },
        { id: "cat-2", name: "Alimentos", visible: true },
        { id: "cat-3", name: "Limpieza", visible: true }
    ];

    const DEMO_PRODUCTS = [
        {
            id: "prod-1",
            name: "Café Premium 500g",
            description: "Café de especialidad, tostado medio, notas a chocolate.",
            categoryId: "cat-2",
            price: 4500,
            promoPrice: 3900,
            promoStart: null,
            promoEnd: null,
            image: "",
            unit: "un",
            status: "active",
            featured: true
        },
        {
            id: "prod-2",
            name: "Agua Mineral 1.5L",
            description: "Agua mineral sin gas, fuente natural.",
            categoryId: "cat-1",
            price: 1200,
            promoPrice: null,
            promoStart: null,
            promoEnd: null,
            image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop",
            unit: "un",
            status: "active",
            featured: false
        },
        {
            id: "prod-3",
            name: "Detergente Líquido 1L",
            description: "Detergente concentrado con aroma a limón.",
            categoryId: "cat-3",
            price: 2800,
            promoPrice: 2500,
            promoStart: null,
            promoEnd: null,
            image: "",
            unit: "un",
            status: "out_of_stock",
            featured: false
        }
    ];

    // ==========================================
    // 2. GESTIÓN DE ALMACENAMIENTO (LocalStorage)
    // ==========================================
    const Storage = {
        get(key, defaultValue) {
            try {
                const item = localStorage.getItem(`wl_${key}`);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error(`Error reading ${key} from localStorage`, e);
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(`wl_${key}`, JSON.stringify(value));
            } catch (e) {
                console.error(`Error saving ${key} to localStorage`, e);
                UI.notify("Error al guardar datos. Almacenamiento lleno?", "error");
            }
        },
        reset() {
            localStorage.removeItem('wl_config');
            localStorage.removeItem('wl_categories');
            localStorage.removeItem('wl_products');
            localStorage.removeItem('wl_cart');
        }
    };

    // ==========================================
    // 3. ESTADO DE LA APLICACIÓN
    // ==========================================
    let state = {
        config: { ...DEFAULT_CONFIG },
        categories: [],
        products: [],
        cart: [],
        activeCategory: "all",
        searchQuery: "",
        sortBy: "default",
        filterPromo: false,
        filterFeatured: false
    };

    // ==========================================
    // 4. LÓGICA DE NEGOCIO
    // ==========================================
    const Business = {
        init() {
            state.config = { ...DEFAULT_CONFIG, ...Storage.get('config', {}) };
            state.categories = Storage.get('categories', DEMO_CATEGORIES);
            state.products = Storage.get('products', DEMO_PRODUCTS);
            state.cart = Storage.get('cart', []);
            
            // Validar carrito contra catálogo actual
            this.validateCart();
            this.applyTheme();
        },

        applyTheme() {
            const fontFamilies = {
                system: {
                    body: 'Arial, sans-serif',
                    display: 'Arial, sans-serif'
                },
                editorial: {
                    body: 'Arial, sans-serif',
                    display: 'Georgia, "Times New Roman", serif'
                },
                humanist: {
                    body: '"Trebuchet MS", Arial, sans-serif',
                    display: '"Trebuchet MS", Arial, sans-serif'
                }
            };
            const fontStyle = Object.prototype.hasOwnProperty.call(fontFamilies, state.config.fontStyle)
                ? state.config.fontStyle
                : DEFAULT_CONFIG.fontStyle;
            const visualStyles = ['minimal', 'soft', 'rounded'];
            const visualStyle = visualStyles.includes(state.config.visualStyle)
                ? state.config.visualStyle
                : DEFAULT_CONFIG.visualStyle;

            document.documentElement.style.setProperty('--primary-color', state.config.colorPrimary);
            document.documentElement.style.setProperty('--secondary-color', state.config.colorSecondary);
            document.documentElement.style.setProperty('--font-family', fontFamilies[fontStyle].body);
            document.documentElement.style.setProperty('--font-display', fontFamilies[fontStyle].display);
            document.documentElement.dataset.style = visualStyle;
            document.getElementById('store-name').textContent = state.config.name;
            document.getElementById('store-desc').textContent = state.config.description;
            document.getElementById('footer-store-name').textContent = state.config.name;
            document.getElementById('current-year').textContent = new Date().getFullYear();
            
            const logo = document.getElementById('store-logo');
            logo.textContent = state.config.name.charAt(0).toUpperCase();
        },

        validateCart() {
            let updated = false;
            state.cart = state.cart.filter(item => {
                const product = state.products.find(p => p.id === item.productId);
                if (!product || product.status === 'hidden' || product.status === 'out_of_stock') {
                    updated = true;
                    return false;
                }
                // Actualizar precio al vigente
                const currentPrice = this.getEffectivePrice(product);
                if (item.price !== currentPrice) {
                    item.price = currentPrice;
                    updated = true;
                }
                return true;
            });
            if (updated) {
                Storage.set('cart', state.cart);
                UI.notify("El carrito fue actualizado por cambios en el catálogo", "info");
            }
        },

        getEffectivePrice(product) {
            if (product.promoPrice && product.promoPrice < product.price) {
                // Validar fechas si existen
                const now = new Date();
                if (product.promoStart && new Date(product.promoStart) > now) return product.price;
                if (product.promoEnd && new Date(product.promoEnd) < now) return product.price;
                return product.promoPrice;
            }
            return product.price;
        },

        getDiscountPercentage(product) {
            if (!product.promoPrice || product.promoPrice >= product.price) return 0;
            return Math.round(((product.price - product.promoPrice) / product.price) * 100);
        },

        addToCart(productId) {
            const product = state.products.find(p => p.id === productId);
            if (!product || product.status !== 'active') return;

            const existing = state.cart.find(item => item.productId === productId);
            if (existing) {
                existing.quantity += 1;
            } else {
                state.cart.push({
                    productId: product.id,
                    name: product.name,
                    price: this.getEffectivePrice(product),
                    quantity: 1,
                    unit: product.unit
                });
            }
            Storage.set('cart', state.cart);
            UI.updateCartUI();
            UI.notify(`${product.name} agregado al carrito`, "success");
        },

        updateCartQuantity(productId, delta) {
            const item = state.cart.find(i => i.productId === productId);
            if (!item) return;

            item.quantity += delta;
            if (item.quantity <= 0) {
                state.cart = state.cart.filter(i => i.productId !== productId);
            }
            Storage.set('cart', state.cart);
            UI.updateCartUI();
        },

        clearCart() {
            if (state.cart.length === 0) return;
            if (confirm("¿Estás seguro de que deseas vaciar el carrito?")) {
                state.cart = [];
                Storage.set('cart', state.cart);
                UI.updateCartUI();
                UI.notify("Carrito vaciado", "info");
            }
        },

        getCartTotal() {
            return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },

        getCartCount() {
            return state.cart.reduce((sum, item) => sum + item.quantity, 0);
        },

        getFilteredProducts() {
            let filtered = state.products.filter(p => p.status !== 'hidden');

            if (state.activeCategory !== 'all') {
                filtered = filtered.filter(p => p.categoryId === state.activeCategory);
            }

            if (state.searchQuery) {
                const q = state.searchQuery.toLowerCase();
                filtered = filtered.filter(p => 
                    p.name.toLowerCase().includes(q) || 
                    (p.description && p.description.toLowerCase().includes(q))
                );
            }

            if (state.filterPromo) {
                filtered = filtered.filter(p => this.getEffectivePrice(p) < p.price);
            }

            if (state.filterFeatured) {
                filtered = filtered.filter(p => p.featured);
            }

            // Ordenamiento
            if (state.sortBy === 'price-asc') {
                filtered.sort((a, b) => this.getEffectivePrice(a) - this.getEffectivePrice(b));
            } else if (state.sortBy === 'price-desc') {
                filtered.sort((a, b) => this.getEffectivePrice(b) - this.getEffectivePrice(a));
            } else if (state.sortBy === 'alpha') {
                filtered.sort((a, b) => a.name.localeCompare(b.name));
            }

            return filtered;
        }
    };

    // ==========================================
    // 5. RENDERIZADO DE UI
    // ==========================================
    const UI = {
        notify(message, type = 'info') {
            const container = document.getElementById('notification-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        updateCartUI() {
            const count = Business.getCartCount();
            document.getElementById('cart-count').textContent = count;
            
            const cartItems = document.getElementById('cart-items');
            const cartEmpty = document.getElementById('cart-empty');
            
            cartItems.innerHTML = '';
            if (state.cart.length === 0) {
                cartEmpty.classList.remove('hidden');
            } else {
                cartEmpty.classList.add('hidden');
                state.cart.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'cart-item';
                    div.innerHTML = `
                        <div class="cart-item-info">
                            <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                            <div class="cart-item-price">${state.config.currency}${item.price.toFixed(2)} / ${item.unit}</div>
                        </div>
                        <div class="cart-item-controls">
                            <button class="qty-btn" data-action="decrease" data-id="${item.productId}">-</button>
                            <span class="cart-item-qty">${item.quantity}</span>
                            <button class="qty-btn" data-action="increase" data-id="${item.productId}">+</button>
                        </div>
                    `;
                    cartItems.appendChild(div);
                });
            }
            
            document.getElementById('cart-total-amount').textContent = 
                `${state.config.currency}${Business.getCartTotal().toFixed(2)}`;
            document.getElementById('checkout-total').textContent = 
                `${state.config.currency}${Business.getCartTotal().toFixed(2)}`;
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        renderCategories() {
            const nav = document.getElementById('categories-nav');
            nav.innerHTML = '';
            
            const allBtn = document.createElement('button');
            allBtn.className = `cat-tab ${state.activeCategory === 'all' ? 'active' : ''}`;
            allBtn.textContent = 'Todas';
            allBtn.dataset.cat = 'all';
            nav.appendChild(allBtn);

            state.categories.filter(c => c.visible).forEach(cat => {
                const btn = document.createElement('button');
                btn.className = `cat-tab ${state.activeCategory === cat.id ? 'active' : ''}`;
                btn.textContent = cat.name;
                btn.dataset.cat = cat.id;
                nav.appendChild(btn);
            });
        },

        renderProducts() {
            const grid = document.getElementById('products-grid');
            const emptyState = document.getElementById('empty-state');
            grid.innerHTML = '';
            
            const products = Business.getFilteredProducts();
            
            if (products.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }
            emptyState.classList.add('hidden');

            products.forEach(product => {
                const effectivePrice = Business.getEffectivePrice(product);
                const isPromo = effectivePrice < product.price;
                const discount = Business.getDiscountPercentage(product);
                const isOutOfStock = product.status === 'out_of_stock';

                const card = document.createElement('div');
                card.className = 'product-card';
                
                let badges = '';
                if (isOutOfStock) badges += `<span class="badge-out-of-stock">Agotado</span>`;
                else {
                    if (product.featured) badges += `<span class="badge-featured">Destacado</span>`;
                    if (isPromo) badges += `<span class="badge-promo">-${discount}%</span>`;
                }

                const imageHtml = product.image 
                    ? `<img src="${this.escapeHtml(product.image)}" alt="${this.escapeHtml(product.name)}" class="product-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="product-image-fallback" style="display:none;">📦</div>`
                    : `<div class="product-image-fallback"><span>Imagen no disponible</span></div>`;

                const category = state.categories.find(c => c.id === product.categoryId);
                const catName = category ? category.name : 'Sin categoría';

                card.innerHTML = `
                    <div style="position: relative;">
                        ${imageHtml}
                        <div class="product-badges">${badges}</div>
                    </div>
                    <div class="product-info">
                        <div class="product-category">${this.escapeHtml(catName)}</div>
                        <h3 class="product-name">${this.escapeHtml(product.name)}</h3>
                        <p class="product-desc">${this.escapeHtml(product.description || '')}</p>
                        <div class="product-pricing">
                            ${isPromo ? `<span class="price-original">${state.config.currency}${product.price.toFixed(2)}</span>` : ''}
                            <span class="price-current ${isPromo ? 'price-promo' : ''}">${state.config.currency}${effectivePrice.toFixed(2)}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-primary btn-add-cart" 
                                data-id="${product.id}" 
                                ${isOutOfStock ? 'disabled' : ''}>
                                ${isOutOfStock ? 'Agotado' : 'Agregar al Carrito'}
                            </button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        },

        renderAdminProducts() {
            const list = document.getElementById('admin-products-list');
            list.innerHTML = '';
            const search = document.getElementById('admin-search').value.toLowerCase();
            
            state.products.filter(p => p.name.toLowerCase().includes(search)).forEach(p => {
                const div = document.createElement('div');
                div.className = 'admin-item';
                const statusText = p.status === 'active' ? 'Activo' : p.status === 'out_of_stock' ? 'Agotado' : 'Oculto';
                div.innerHTML = `
                    <div class="admin-item-info">
                        <div class="admin-item-name">${this.escapeHtml(p.name)}</div>
                        <div class="admin-item-meta">${statusText} | ${state.config.currency}${p.price}</div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn btn-secondary" data-action="edit-prod" data-id="${p.id}">Editar</button>
                        <button class="btn btn-danger" data-action="delete-prod" data-id="${p.id}">Eliminar</button>
                    </div>
                `;
                list.appendChild(div);
            });
        },

        renderAdminCategories() {
            const list = document.getElementById('admin-categories-list');
            list.innerHTML = '';
            state.categories.forEach(c => {
                const div = document.createElement('div');
                div.className = 'admin-item';
                div.innerHTML = `
                    <div class="admin-item-info">
                        <div class="admin-item-name">${this.escapeHtml(c.name)}</div>
                        <div class="admin-item-meta">${c.visible ? 'Visible' : 'Oculto'}</div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn btn-secondary" data-action="edit-cat" data-id="${c.id}">Editar</button>
                        <button class="btn btn-danger" data-action="delete-cat" data-id="${c.id}">Eliminar</button>
                    </div>
                `;
                list.appendChild(div);
            });
        },

        populateProductForm(product = null) {
            document.getElementById('prod-id').value = product ? product.id : '';
            document.getElementById('product-form-title').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
            document.getElementById('prod-name').value = product ? product.name : '';
            document.getElementById('prod-desc').value = product ? (product.description || '') : '';
            document.getElementById('prod-unit').value = product ? product.unit : 'un';
            document.getElementById('prod-price').value = product ? product.price : '';
            document.getElementById('prod-promo-price').value = product ? (product.promoPrice || '') : '';
            document.getElementById('prod-image').value = product ? (product.image || '') : '';
            document.getElementById('prod-status').value = product ? product.status : 'active';
            document.getElementById('prod-featured').checked = product ? product.featured : false;

            const catSelect = document.getElementById('prod-category');
            catSelect.innerHTML = '';
            state.categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (product && product.categoryId === c.id) opt.selected = true;
                catSelect.appendChild(opt);
            });
        },

        populateConfigForm() {
            document.getElementById('cfg-name').value = state.config.name;
            document.getElementById('cfg-desc').value = state.config.description;
            document.getElementById('cfg-whatsapp').value = state.config.whatsapp;
            document.getElementById('cfg-currency').value = state.config.currency;
            document.getElementById('cfg-color-primary').value = state.config.colorPrimary;
            document.getElementById('cfg-color-secondary').value = state.config.colorSecondary;
            document.getElementById('cfg-font').value = state.config.fontStyle || DEFAULT_CONFIG.fontStyle;
            document.getElementById('cfg-style').value = state.config.visualStyle || DEFAULT_CONFIG.visualStyle;
        }
    };

    // ==========================================
    // 6. MANEJO DE EVENTOS
    // ==========================================
    const Events = {
        init() {
            // Búsqueda y Filtros
            document.getElementById('search-input').addEventListener('input', (e) => {
                state.searchQuery = e.target.value;
                UI.renderProducts();
            });
            document.getElementById('sort-select').addEventListener('change', (e) => {
                state.sortBy = e.target.value;
                UI.renderProducts();
            });
            document.getElementById('filter-promo').addEventListener('change', (e) => {
                state.filterPromo = e.target.checked;
                UI.renderProducts();
            });
            document.getElementById('filter-featured').addEventListener('change', (e) => {
                state.filterFeatured = e.target.checked;
                UI.renderProducts();
            });

            // Categorías (Delegación)
            document.getElementById('categories-nav').addEventListener('click', (e) => {
                if (e.target.classList.contains('cat-tab')) {
                    state.activeCategory = e.target.dataset.cat;
                    UI.renderCategories();
                    UI.renderProducts();
                }
            });

            // Catálogo (Delegación)
            document.getElementById('products-grid').addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-add-cart');
                if (btn && !btn.disabled) {
                    Business.addToCart(btn.dataset.id);
                }
            });

            // Carrito
            document.getElementById('cart-btn').addEventListener('click', () => Modals.open('cart-modal'));
            document.getElementById('clear-cart-btn').addEventListener('click', () => Business.clearCart());
            document.getElementById('cart-items').addEventListener('click', (e) => {
                if (e.target.classList.contains('qty-btn')) {
                    const action = e.target.dataset.action;
                    const id = e.target.dataset.id;
                    Business.updateCartQuantity(id, action === 'increase' ? 1 : -1);
                }
            });

            // Checkout
            document.getElementById('checkout-btn').addEventListener('click', () => {
                if (state.cart.length === 0) {
                    UI.notify("El carrito está vacío", "error");
                    return;
                }
                Modals.close('cart-modal');
                Modals.open('checkout-modal');
            });

            document.getElementById('delivery-mode').addEventListener('change', (e) => {
                const addrGroup = document.getElementById('address-group');
                const addrInput = document.getElementById('customer-address');
                if (e.target.value === 'envio') {
                    addrGroup.classList.remove('hidden');
                    addrInput.required = true;
                } else {
                    addrGroup.classList.add('hidden');
                    addrInput.required = false;
                    addrInput.value = '';
                }
            });

            document.getElementById('checkout-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.processCheckout();
            });

            // Admin
            document.getElementById('open-admin-btn').addEventListener('click', () => {
                UI.populateConfigForm();
                UI.renderAdminProducts();
                UI.renderAdminCategories();
                Modals.open('admin-modal');
            });

            // Tabs Admin
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById(btn.dataset.tab).classList.add('active');
                });
            });

            // Admin Productos
            document.getElementById('admin-search').addEventListener('input', () => UI.renderAdminProducts());
            document.getElementById('add-product-btn').addEventListener('click', () => {
                UI.populateProductForm();
                Modals.open('product-form-modal');
            });
            document.getElementById('admin-products-list').addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.action === 'edit-prod') {
                    const prod = state.products.find(p => p.id === id);
                    UI.populateProductForm(prod);
                    Modals.open('product-form-modal');
                } else if (btn.dataset.action === 'delete-prod') {
                    if (confirm('¿Eliminar este producto?')) {
                        state.products = state.products.filter(p => p.id !== id);
                        Storage.set('products', state.products);
                        UI.renderAdminProducts();
                        UI.renderProducts();
                        UI.notify("Producto eliminado", "success");
                    }
                }
            });

            document.getElementById('product-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });

            // Admin Categorías
            document.getElementById('category-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCategory();
            });
            document.getElementById('cancel-cat-btn').addEventListener('click', () => {
                document.getElementById('category-form').reset();
                document.getElementById('cat-id').value = '';
            });
            document.getElementById('admin-categories-list').addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.action === 'edit-cat') {
                    const cat = state.categories.find(c => c.id === id);
                    document.getElementById('cat-id').value = cat.id;
                    document.getElementById('cat-name').value = cat.name;
                } else if (btn.dataset.action === 'delete-cat') {
                    if (confirm('¿Eliminar esta categoría?')) {
                        state.categories = state.categories.filter(c => c.id !== id);
                        Storage.set('categories', state.categories);
                        UI.renderAdminCategories();
                        UI.renderCategories();
                    }
                }
            });

            // Admin Config
            document.getElementById('config-form').addEventListener('submit', (e) => {
                e.preventDefault();
                state.config.name = document.getElementById('cfg-name').value;
                state.config.description = document.getElementById('cfg-desc').value;
                state.config.whatsapp = document.getElementById('cfg-whatsapp').value.replace(/\D/g, '');
                state.config.currency = document.getElementById('cfg-currency').value;
                state.config.colorPrimary = document.getElementById('cfg-color-primary').value;
                state.config.colorSecondary = document.getElementById('cfg-color-secondary').value;
                state.config.fontStyle = document.getElementById('cfg-font').value;
                state.config.visualStyle = document.getElementById('cfg-style').value;
                
                Storage.set('config', state.config);
                Business.applyTheme();
                UI.notify("Configuración guardada", "success");
            });

            // Admin Datos
            document.getElementById('export-data-btn').addEventListener('click', () => {
                const data = {
                    config: state.config,
                    categories: state.categories,
                    products: state.products,
                    exportDate: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tienda-backup-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                UI.notify("Datos exportados", "success");
            });

            document.getElementById('import-file').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (data.config && data.products && data.categories) {
                            state.config = { ...DEFAULT_CONFIG, ...data.config };
                            state.categories = data.categories;
                            state.products = data.products;
                            Storage.set('config', state.config);
                            Storage.set('categories', state.categories);
                            Storage.set('products', state.products);
                            Business.applyTheme();
                            UI.renderCategories();
                            UI.renderProducts();
                            UI.notify("Datos importados correctamente", "success");
                        } else {
                            throw new Error("Estructura inválida");
                        }
                    } catch (err) {
                        UI.notify("Error al importar: archivo JSON inválido", "error");
                    }
                };
                reader.readAsText(file);
                e.target.value = ''; // Reset
            });

            document.getElementById('reset-data-btn').addEventListener('click', () => {
                if (confirm("¿Restaurar todos los datos a los valores de demostración? Se perderán los cambios locales.")) {
                    Storage.reset();
                    location.reload();
                }
            });

            // Modales (Cierre)
            document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const modal = btn.closest('.modal');
                    Modals.close(modal.id);
                });
            });
            
            // Cerrar modal al hacer clic fuera
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) Modals.close(modal.id);
                });
            });
        },

        processCheckout() {
            const name = document.getElementById('customer-name').value.trim();
            const phone = document.getElementById('customer-phone').value.trim();
            const mode = document.getElementById('delivery-mode').value;
            const address = document.getElementById('customer-address').value.trim();
            const payment = document.getElementById('payment-method').value;
            const comments = document.getElementById('order-comments').value.trim();

            if (!name) {
                UI.notify("El nombre es obligatorio", "error");
                return;
            }
            if (mode === 'envio' && !address) {
                UI.notify("La dirección es obligatoria para envíos", "error");
                return;
            }

            // Construir mensaje
            let msg = `*Nuevo Pedido - ${state.config.name}*\n\n`;
            msg += `*Cliente:* ${name}\n`;
            if (phone) msg += `*Teléfono:* ${phone}\n`;
            msg += `*Entrega:* ${mode === 'envio' ? `Envío a: ${address}` : 'Retiro en local'}\n`;
            msg += `*Pago:* ${payment}\n\n`;
            msg += `*Productos:*\n`;
            
            state.cart.forEach(item => {
                const subtotal = (item.price * item.quantity).toFixed(2);
                msg += `- ${item.quantity}x ${item.name} (${state.config.currency}${item.price}) = ${state.config.currency}${subtotal}\n`;
            });
            
            msg += `\n*Total:* ${state.config.currency}${Business.getCartTotal().toFixed(2)}\n`;
            if (comments) msg += `\n*Comentarios:* ${comments}\n`;
            msg += `\n_Por favor, confirmar disponibilidad y detalles de pago._`;

            const encodedMsg = encodeURIComponent(msg);
            const waNumber = state.config.whatsapp.replace(/\D/g, '');
            
            if (!waNumber || waNumber.length < 10) {
                UI.notify("Número de WhatsApp no configurado correctamente", "error");
                return;
            }

            const waUrl = `https://wa.me/${waNumber}?text=${encodedMsg}`;
            window.open(waUrl, '_blank');
            
            UI.notify("Redirigiendo a WhatsApp. ¡No olvides enviar el mensaje!", "info");
            Modals.close('checkout-modal');
            // No vaciamos el carrito automáticamente porque no podemos verificar si el mensaje se envió.
        },

        saveProduct() {
            const id = document.getElementById('prod-id').value;
            const productData = {
                id: id || `prod-${Date.now()}`,
                name: document.getElementById('prod-name').value.trim(),
                description: document.getElementById('prod-desc').value.trim(),
                categoryId: document.getElementById('prod-category').value,
                price: parseFloat(document.getElementById('prod-price').value) || 0,
                promoPrice: parseFloat(document.getElementById('prod-promo-price').value) || null,
                image: document.getElementById('prod-image').value.trim(),
                unit: document.getElementById('prod-unit').value.trim() || 'un',
                status: document.getElementById('prod-status').value,
                featured: document.getElementById('prod-featured').checked
            };

            // Validación básica de promo
            if (productData.promoPrice && productData.promoPrice >= productData.price) {
                UI.notify("El precio promocional debe ser menor al precio original", "error");
                return;
            }

            if (id) {
                const idx = state.products.findIndex(p => p.id === id);
                if (idx !== -1) state.products[idx] = productData;
            } else {
                state.products.push(productData);
            }

            Storage.set('products', state.products);
            Modals.close('product-form-modal');
            UI.renderAdminProducts();
            UI.renderProducts();
            UI.notify("Producto guardado", "success");
        },

        saveCategory() {
            const id = document.getElementById('cat-id').value;
            const name = document.getElementById('cat-name').value.trim();
            if (!name) return;

            if (id) {
                const cat = state.categories.find(c => c.id === id);
                if (cat) cat.name = name;
            } else {
                state.categories.push({
                    id: `cat-${Date.now()}`,
                    name: name,
                    visible: true
                });
            }

            Storage.set('categories', state.categories);
            document.getElementById('category-form').reset();
            document.getElementById('cat-id').value = '';
            UI.renderAdminCategories();
            UI.renderCategories();
            UI.notify("Categoría guardada", "success");
        }
    };

    // ==========================================
    // 7. UTILIDADES DE MODALES
    // ==========================================
    const Modals = {
        open(id) {
            document.getElementById(id).classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        },
        close(id) {
            document.getElementById(id).classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    // ==========================================
    // 8. INICIALIZACIÓN
    // ==========================================
    return {
        init() {
            Business.init();
            UI.renderCategories();
            UI.renderProducts();
            UI.updateCartUI();
            Events.init();
        }
    };
})();

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', App.init);