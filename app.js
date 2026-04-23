class InventoryManager {
    constructor() {
        this.products = [];
        this.searchQuery = '';
        this.chart = null;
    }

    async loadData() {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            this.products = data.map(p => ({
                name: p.Name,
                costPrice: p.CostPrice,
                sellPrice: p.SellPrice,
                quantity: p.Quantity,
                sales: p.Sales,
                barcode: p.Barcode.toString()
            }));
            this.updateUI();
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    async addProduct(productData) {
        try {
            const payload = {
                "Name": productData.name,
                "CostPrice": productData.costPrice,
                "SellPrice": productData.sellPrice,
                "Quantity": productData.quantity,
                "Sales": 0,
                "Barcode": Math.floor(100000 + Math.random() * 900000).toString()
            };
            await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            this.loadData();
        } catch (error) {
            console.error("Error adding product:", error);
        }
    }

    async sellProduct(barcode, quantity) {
        try {
            const response = await fetch('/api/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode, quantity })
            });
            const result = await response.json();
            if (result.status === "success") {
                this.loadData();
                return { success: true };
            }
            return { success: false, message: result.message };
        } catch (error) {
            return { success: false, message: "Server error" };
        }
    }

    async deleteProduct(barcode) {
        if(confirm('Are you sure?')) {
            await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode })
            });
            this.loadData();
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
        const totalProfit = this.products.reduce((acc, p) => acc + (p.sellPrice - p.costPrice) * p.sales, 0);
        const totalItems = this.products.reduce((acc, p) => acc + p.quantity, 0);
        const lowStock = this.products.filter(p => p.quantity < 5).length;

        document.getElementById('total-profit').textContent = `$${totalProfit.toFixed(2)}`;
        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('low-stock-count').textContent = lowStock;

        const tbody = document.getElementById('inventory-body');
        tbody.innerHTML = '';
        const filtered = this.getFilteredProducts();
        
        filtered.forEach(p => {
            let statusClass = p.quantity === 0 ? 'status-out-of-stock' : (p.quantity < 5 ? 'status-low-stock' : 'status-in-stock');
            let statusText = p.quantity === 0 ? 'Out of Stock' : (p.quantity < 5 ? 'Low Stock' : 'In Stock');

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
        const labels = this.products.map(p => p.name);
        const data = this.products.map(p => p.sales);

        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
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

const manager = new InventoryManager();

document.getElementById('search-input').addEventListener('input', (e) => manager.setSearch(e.target.value));

const productModal = document.getElementById('product-modal');
const sellModal = document.getElementById('sell-modal');

document.getElementById('add-product-btn').onclick = () => productModal.style.display = 'flex';
document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => {
    productModal.style.display = 'none';
    sellModal.style.display = 'none';
});

document.getElementById('add-product-form').onsubmit = async (e) => {
    e.preventDefault();
    await manager.addProduct({
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

document.getElementById('sell-product-form').onsubmit = async (e) => {
    e.preventDefault();
    const barcode = document.getElementById('sell-barcode').value;
    const qty = parseInt(document.getElementById('sell-qty').value);
    
    const result = await manager.sellProduct(barcode, qty);
    if (result.success) {
        sellModal.style.display = 'none';
        e.target.reset();
    } else {
        alert(result.message);
    }
};

window.onload = () => manager.loadData();
