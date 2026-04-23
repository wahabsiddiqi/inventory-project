from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)

# Files
INVENTORY_FILE = "inventory.csv"
SALES_LOG_FILE = "sales_log.csv"

def init_files():
    if not os.path.exists(INVENTORY_FILE):
        df = pd.DataFrame(columns=["Name", "CostPrice", "SellPrice", "Quantity", "Sales", "Barcode"])
        df.to_csv(INVENTORY_FILE, index=False)
    
    if not os.path.exists(SALES_LOG_FILE):
        df = pd.DataFrame(columns=["Timestamp", "Name", "Barcode", "Quantity", "Price", "Total"])
        df.to_csv(SALES_LOG_FILE, index=False)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    df = pd.read_csv(INVENTORY_FILE)
    # Convert to list of dicts
    data = df.to_dict(orient='records')
    return jsonify(data)

@app.route('/api/inventory', methods=['POST'])
def add_product():
    product = request.json
    df = pd.read_csv(INVENTORY_FILE)
    
    new_row = pd.DataFrame([product])
    df = pd.concat([df, new_row], ignore_index=True)
    df.to_csv(INVENTORY_FILE, index=False)
    return jsonify({"status": "success"})

@app.route('/api/sell', methods=['POST'])
def sell_product():
    data = request.json
    barcode = str(data['barcode'])
    qty = int(data['quantity'])
    
    df = pd.read_csv(INVENTORY_FILE)
    df['Barcode'] = df['Barcode'].astype(str)
    
    if barcode in df['Barcode'].values:
        idx = df[df['Barcode'] == barcode].index[0]
        
        if df.loc[idx, 'Quantity'] >= qty:
            # Update Inventory
            df.loc[idx, 'Quantity'] -= qty
            df.loc[idx, 'Sales'] += qty
            df.to_csv(INVENTORY_FILE, index=False)
            
            # Log Sale with Timestamp
            log_df = pd.read_csv(SALES_LOG_FILE)
            new_log = {
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "Name": df.loc[idx, 'Name'],
                "Barcode": barcode,
                "Quantity": qty,
                "Price": df.loc[idx, 'SellPrice'],
                "Total": df.loc[idx, 'SellPrice'] * qty
            }
            log_df = pd.concat([log_df, pd.DataFrame([new_log])], ignore_index=True)
            log_df.to_csv(SALES_LOG_FILE, index=False)
            
            return jsonify({"status": "success"})
        else:
            return jsonify({"status": "error", "message": "Not enough stock"}), 400
    
    return jsonify({"status": "error", "message": "Product not found"}), 404

@app.route('/api/delete', methods=['POST'])
def delete_product():
    barcode = str(request.json['barcode'])
    df = pd.read_csv(INVENTORY_FILE)
    df['Barcode'] = df['Barcode'].astype(str)
    
    df = df[df['Barcode'] != barcode]
    df.to_csv(INVENTORY_FILE, index=False)
    return jsonify({"status": "success"})

if __name__ == "__main__":
    init_files()
    print("Server running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
