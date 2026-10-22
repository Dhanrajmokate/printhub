# 🖨️ PrintHub Python Mini-Project Dashboard

A real-time Python analytics and print queue dashboard for the PrintHub Smart Print ecosystem.

---

## 📚 3 Core Python Libraries Used

1. **`streamlit`** (`v1.63.0`):
   - Powers the interactive web dashboard interface.
   - Provides live tabs, KPI metric cards, filters, and dynamic layout.
   
2. **`pandas`** (`v3.0.5`):
   - Handles tabular data structuring, filtering, grouping, and aggregations.
   - Calculates business metrics (average pages, revenue volume, color ratios).
   - Enables one-click CSV data export for shop accounts.

3. **`requests`** (`v2.34.2`):
   - Integrates with the live PrintHub REST API (`https://printhub-cloud-api.onrender.com/api`).
   - Authenticates shopkeepers (`shop@printhub.com` / `password123`) using JWT tokens.
   - Fetches the active FIFO print queue and history.

*(Bonus: **`matplotlib`** for visual charts like Color vs. B&W pie charts and order volume bar graphs)*

---

## 🚀 How to Run the Dashboard

### Method 1: One-Click Launcher (Windows)
Double-click:
📁 `run_dashboard.bat`

### Method 2: Command Line (PowerShell / Terminal)
```bash
cd "c:\smart print\python-dashboard"
streamlit run app.py
```

The dashboard will automatically open in your default browser at:  
👉 **`http://localhost:8501`**

---

## 🌟 Key Dashboard Features

1. **Live Cloud Sync / Demo Mode**: Connects directly to the live Render cloud backend or runs in offline demo mode with sample queue data.
2. **Key Metric Cards**: Total business volume (₹), pending jobs, total documents, and B&W document percentage.
3. **Live FIFO Queue**: View real-time pending customer print orders, document specifications, and phone numbers.
4. **Visual Analytics**: Interactive pie charts and bar graphs for page counts and color ratios.
5. **Data Explorer**: Search and filter records with instant CSV export.
6. **Print Simulator**: Inject simulated customer print orders into the queue to test real-time dashboard updates.
