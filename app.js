class Product {
    constructor(name, costPrice, sellPrice, quantity, sales = 0, barcode = null) {
        this.name = name;
        this.costPrice = parseFloat(costPrice);
        this.sellPrice = parseFloat(sellPrice);
        this.quantity = parseInt(quantity);
        this.sales = parseInt(sales);
        this.barcode = barcode || this.generateBarcode();
    }

    generateBarcode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    getProfit() {
        return (this.sellPrice - this.costPrice) * this.sales;
    }
}

class InventoryManager {
    constructor() {
        this.products = this.loadProducts();
        this.salesLog = this.loadSalesLog();
        this.searchQuery = '';
        this.chart = null;
    }

    loadProducts() {
        const data = localStorage.getItem('inventory_data');
        if (data) {
            return JSON.parse(data).map(p =>
                new Product(p.name, p.costPrice, p.sellPrice, p.quantity, p.sales, p.barcode)
            );
        }
        // Default sample data (from CSV)
        return [
            new Product("Soap", 23.45, 45.0, 100, 0, "175140"),
            new Product("Lays", 10.0, 30.0, 77, 23, "138225"),
            new Product("Juice", 12.0, 25.0, 50, 150, "203259")
        ];
    }

    loadSalesLog() {
        const data = localStorage.getItem('sales_log');
        return data ? JSON.parse(data) : [];
    }

    save() {
        localStorage.setItem('inventory_data', JSON.stringify(this.products));
        localStorage.setItem('sales_log', JSON.stringify(this.salesLog));
        this.updateUI();
    }

    addProduct(productData) {
        const newProduct = new Product(
            productData.name,
            productData.costPrice,
            productData.sellPrice,
            productData.quantity
        );
        this.products.push(newProduct);
        this.save();
    }

    sellProduct(barcode, quantity) {
        const product = this.products.find(p => p.barcode === barcode);
        if (!product) return { success: false, message: "Product not found!" };
        if (product.quantity < quantity) return { success: false, message: "Insufficient stock!" };

        product.quantity -= quantity;
        product.sales += quantity;

        this.salesLog.push({
            timestamp: new Date().toLocaleString(),
            name: product.name,
            barcode: barcode,
            quantity: quantity,
            price: product.sellPrice,
            total: product.sellPrice * quantity
        });

        this.save();
        return { success: true };
    }

    deleteProduct(barcode) {
        if (confirm('Are you sure you want to delete this product?')) {
            this.products = this.products.filter(p => p.barcode !== barcode);
            this.save();
        }
    }

    setSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.updateUI();
    }

    getFilteredProducts() {
        if (!this.searchQuery) return this.products;
        return this.products.filter(p =>
            p.name.toLowerCase().includes(this.searchQuery) ||
            p.barcode.includes(this.searchQuery)
        );
    }

    updateUI() {
        const totalProfit = this.products.reduce((acc, p) => acc + p.getProfit(), 0);
        const totalItems = this.products.reduce((acc, p) => acc + p.quantity, 0);
        const lowStock = this.products.filter(p => p.quantity < 5).length;

        document.getElementById('total-profit').textContent = `$${totalProfit.toFixed(2)}`;
        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('low-stock-count').textContent = lowStock;

        const tbody = document.getElementById('inventory-body');
        tbody.innerHTML = '';

        this.getFilteredProducts().forEach(p => {
            let statusClass = 'status-in-stock';
            let statusText = 'In Stock';
            if (p.quantity === 0) { statusClass = 'status-out-of-stock'; statusText = 'Out of Stock'; }
            else if (p.quantity < 5) { statusClass = 'status-low-stock'; statusText = 'Low Stock'; }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 500;">${p.name}</td>
                <td style="color: #64748b; font-family: monospace;">${p.barcode}</td>
                <td>$${p.costPrice.toFixed(2)}</td>
                <td>$${p.sellPrice.toFixed(2)}</td>
                <td>${p.quantity}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn" onclick="openSellModal('${p.barcode}', '${p.name}')">
                        <i data-lucide="shopping-cart" style="width:14px"></i>
                    </button>
                    <button class="action-btn" onclick="manager.deleteProduct('${p.barcode}')">
                        <i data-lucide="trash-2" style="width:14px"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        lucide.createIcons();
        this.updateChart();
    }

    updateChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.products.map(p => p.name),
                datasets: [{
                    data: this.products.map(p => p.sales),
                    backgroundColor: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
            }
        });
    }
}

// -------------------- UI CONTROLLER --------------------

const manager = new InventoryManager();

document.getElementById('search-input').addEventListener('input', (e) => manager.setSearch(e.target.value));

const productModal = document.getElementById('product-modal');
const sellModal = document.getElementById('sell-modal');

document.getElementById('add-product-btn').onclick = () => productModal.style.display = 'flex';

document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => {
    productModal.style.display = 'none';
    sellModal.style.display = 'none';
});

window.onclick = (e) => {
    if (e.target === productModal) productModal.style.display = 'none';
    if (e.target === sellModal) sellModal.style.display = 'none';
};

document.getElementById('add-product-form').onsubmit = (e) => {
    e.preventDefault();
    manager.addProduct({
        name: document.getElementById('p-name').value,
        costPrice: parseFloat(document.getElementById('p-cost').value),
        sellPrice: parseFloat(document.getElementById('p-sell').value),
        quantity: parseInt(document.getElementById('p-qty').value)
    });
    productModal.style.display = 'none';
    e.target.reset();
};

function openSellModal(barcode, name) {
    document.getElementById('sell-barcode').value = barcode;
    document.getElementById('sell-product-name').textContent = name;
    sellModal.style.display = 'flex';
}

document.getElementById('sell-product-form').onsubmit = (e) => {
    e.preventDefault();
    const result = manager.sellProduct(
        document.getElementById('sell-barcode').value,
        parseInt(document.getElementById('sell-qty').value)
    );
    if (result.success) {
        sellModal.style.display = 'none';
        e.target.reset();
    } else {
        alert(result.message);
    }
};

window.onload = () => manager.updateUI();
