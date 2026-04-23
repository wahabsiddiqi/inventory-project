import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import tkinter as tk
from tkinter import messagebox, simpledialog
import random

# -------------------- UTIL --------------------

def generate_barcode():
    return str(random.randint(100000, 999999))

# -------------------- PRODUCT CLASS --------------------

class Product:
    def __init__(self, name, cost_price, sell_price, quantity):
        self.name = name
        self.cost_price = float(cost_price)
        self.sell_price = float(sell_price)
        self.quantity = int(quantity)
        self.sales = 0
        self.barcode = generate_barcode()

    def to_dict(self):
        return {
            "Name": self.name,
            "CostPrice": self.cost_price,
            "SellPrice": self.sell_price,
            "Quantity": self.quantity,
            "Sales": self.sales,
            "Barcode": self.barcode
        }

# -------------------- INVENTORY MANAGER --------------------

class InventoryManager:
    def __init__(self, file="inventory.csv"):
        self.file = file
        try:
            self.df = pd.read_csv(self.file)
        except:
            self.df = pd.DataFrame(columns=[
                "Name", "CostPrice", "SellPrice",
                "Quantity", "Sales", "Barcode"
            ])

    def save(self):
        self.df.to_csv(self.file, index=False)

    def add_product(self, product):
        self.df = pd.concat([self.df, pd.DataFrame([product.to_dict()])], ignore_index=True)
        self.save()

    def sell_product(self, barcode, quantity):
        if barcode in self.df["Barcode"].astype(str).values:
            index = self.df[self.df["Barcode"].astype(str) == barcode].index[0]

            if self.df.loc[index, "Quantity"] >= quantity:
                self.df.loc[index, "Quantity"] -= quantity
                self.df.loc[index, "Sales"] += quantity
                self.save()
                return "Sale successful!"
            else:
                return "Not enough stock"
        return "Product not found"

    def calculate_profit(self):
        df = self.df.copy()
        profit = (df["SellPrice"] - df["CostPrice"]) * df["Sales"]
        return profit.sum()

    def low_stock(self):
        return self.df[self.df["Quantity"] < 5]

    def top_selling_graph(self):
        df = self.df.sort_values(by="Sales", ascending=False)

        plt.figure()
        plt.bar(df["Name"], df["Sales"])
        plt.title("Top Selling Products")
        plt.xticks(rotation=45)
        plt.show()

# -------------------- GUI --------------------

class InventoryGUI:
    def __init__(self, manager):
        self.manager = manager
        self.window = tk.Tk()
        self.window.title("📦 Inventory Dashboard")

        # Labels & Entries
        tk.Label(self.window, text="Name").pack()
        self.name = tk.Entry(self.window)
        self.name.pack()

        tk.Label(self.window, text="Cost Price").pack()
        self.cost = tk.Entry(self.window)
        self.cost.pack()

        tk.Label(self.window, text="Sell Price").pack()
        self.sell = tk.Entry(self.window)
        self.sell.pack()

        tk.Label(self.window, text="Quantity").pack()
        self.qty = tk.Entry(self.window)
        self.qty.pack()

        tk.Button(self.window, text="Add Product", command=self.add_product).pack()
        tk.Button(self.window, text="Sell Product", command=self.sell_product).pack()
        tk.Button(self.window, text="Show Profit", command=self.show_profit).pack()
        tk.Button(self.window, text="Top Selling Graph", command=self.manager.top_selling_graph).pack()
        tk.Button(self.window, text="Low Stock Alert", command=self.show_low_stock).pack()

    def add_product(self):
        p = Product(
            self.name.get(),
            self.cost.get(),
            self.sell.get(),
            self.qty.get()
        )
        self.manager.add_product(p)
        messagebox.showinfo("Success", f"Product added!\nBarcode: {p.barcode}")

    def sell_product(self):
        barcode = simpledialog.askstring("Input", "Enter Barcode:")
        qty = int(simpledialog.askstring("Input", "Enter Quantity:"))
        result = self.manager.sell_product(barcode, qty)
        messagebox.showinfo("Result", result)

    def show_profit(self):
        profit = self.manager.calculate_profit()
        messagebox.showinfo("Profit", f"Total Profit: {profit}")

    def show_low_stock(self):
        low = self.manager.low_stock()
        messagebox.showinfo("Low Stock", str(low))

    def run(self):
        self.window.mainloop()

# -------------------- MAIN --------------------

if __name__ == "__main__":
    manager = InventoryManager()
    app = InventoryGUI(manager)
    app.run()