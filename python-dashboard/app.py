"""
PrintHub Smart Print - Python Analytics & Queue Dashboard
Built using:
1. Streamlit - Interactive Web UI & Dashboard
2. Pandas - Data Manipulation, Metrics & Analytics
3. Requests - Cloud REST API Integration
"""

import streamlit as st
import pandas as pd
import requests
import matplotlib.pyplot as plt
from datetime import datetime
import json
import os

# --- Page Configuration ---
st.set_page_config(
    page_title="PrintHub - Shop Analytics & Queue",
    page_icon="🖨️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS styling for sleek modern dark/light UI
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 16px 20px;
        color: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .metric-val {
        font-size: 26px;
        font-weight: 800;
        color: #38bdf8;
    }
    .metric-lbl {
        font-size: 13px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .status-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# --- Sidebar: Configuration & API Connection ---
st.sidebar.title("🖨️ PrintHub Control")
st.sidebar.markdown("### Cloud Connection")

default_api_url = "https://printhub-cloud-api.onrender.com/api"
api_url = st.sidebar.text_input("Backend API URL", value=default_api_url)

shop_email = st.sidebar.text_input("Shop Email", value="shop@printhub.com")
shop_password = st.sidebar.text_input("Password", value="password123", type="password")

connect_btn = st.sidebar.button("🔄 Sync with Cloud API", use_container_width=True)

# --- Session State for Auth and Data ---
if "auth_token" not in st.session_state:
    st.session_state.auth_token = None
if "shop_info" not in st.session_state:
    st.session_state.shop_info = None
if "queue_data" not in st.session_state:
    st.session_state.queue_data = []
if "history_data" not in st.session_state:
    st.session_state.history_data = []
if "is_connected" not in st.session_state:
    st.session_state.is_connected = False


# --- API Helper Functions (requests) ---
def login_and_fetch():
    try:
        # 1. Authenticate with backend
        login_res = requests.post(
            f"{api_url.rstrip('/')}/auth/login",
            json={"email": shop_email, "password": shop_password},
            timeout=12
        )
        if login_res.status_code == 200 and login_res.json().get("success"):
            data = login_res.json()
            st.session_state.auth_token = data.get("token")
            st.session_state.shop_info = data.get("user")
            st.session_state.is_connected = True

            # 2. Fetch Shop Print Queue
            headers = {"Authorization": f"Bearer {st.session_state.auth_token}"}
            queue_res = requests.get(f"{api_url.rstrip('/')}/orders/shop/queue", headers=headers, timeout=12)
            if queue_res.status_code == 200 and queue_res.json().get("success"):
                q_data = queue_res.json()
                st.session_state.queue_data = q_data.get("queue", [])
                st.session_state.history_data = q_data.get("history", [])
                return True, "Synced successfully with PrintHub Cloud API!"
            else:
                return False, "Failed to retrieve queue data."
        else:
            return False, f"Login failed: {login_res.text}"
    except Exception as e:
        return False, f"Connection error: {str(e)}"


# Sample mock data generator if cloud is sleeping or offline
def load_mock_data():
    mock_queue = [
        {
            "id": "mock-1",
            "orderNumber": "PH-20261022-101",
            "status": "PENDING",
            "totalAmount": 45.0,
            "paymentMethod": "SHOP_UPI_QR",
            "paymentStatus": "PAID",
            "createdAt": datetime.now().isoformat(),
            "customer": {"name": "Aman Sharma", "phone": "9876543210"},
            "items": [
                {
                    "id": "item-1",
                    "originalFileName": "Project_Report_Final.pdf",
                    "colorMode": "BW",
                    "copies": 2,
                    "paperSize": "A4",
                    "calculatedPages": 15,
                    "duplexMode": "DUPLEX_LONG",
                    "status": "PENDING"
                }
            ]
        },
        {
            "id": "mock-2",
            "orderNumber": "PH-20261022-102",
            "status": "PENDING",
            "totalAmount": 20.0,
            "paymentMethod": "WALLET",
            "paymentStatus": "PAID",
            "createdAt": datetime.now().isoformat(),
            "customer": {"name": "Priya Patel", "phone": "9823456789"},
            "items": [
                {
                    "id": "item-2",
                    "originalFileName": "ID_Card_BothSides.png",
                    "colorMode": "COLOR",
                    "copies": 2,
                    "paperSize": "A4",
                    "calculatedPages": 1,
                    "duplexMode": "SINGLE",
                    "status": "PENDING"
                }
            ]
        }
    ]

    mock_history = [
        {
            "id": "mock-h1",
            "orderNumber": "PH-20261021-994",
            "status": "COLLECTED",
            "totalAmount": 120.0,
            "paymentMethod": "SHOP_UPI_QR",
            "paymentStatus": "PAID",
            "createdAt": "2026-10-21T10:30:00Z",
            "customer": {"name": "Rahul Verma", "phone": "9123456780"},
            "items": [
                {"id": "ih-1", "originalFileName": "Thesis_Binding.pdf", "colorMode": "BW", "copies": 3, "paperSize": "A4", "calculatedPages": 20, "duplexMode": "DUPLEX_LONG", "status": "PRINTED"},
                {"id": "ih-2", "originalFileName": "Cover_Page.pdf", "colorMode": "COLOR", "copies": 3, "paperSize": "A4", "calculatedPages": 1, "duplexMode": "SINGLE", "status": "PRINTED"}
            ]
        },
        {
            "id": "mock-h2",
            "orderNumber": "PH-20261021-882",
            "status": "PRINTED",
            "totalAmount": 50.0,
            "paymentMethod": "RAZORPAY",
            "paymentStatus": "PAID",
            "createdAt": "2026-10-21T11:45:00Z",
            "customer": {"name": "Sneha Roy", "phone": "9988776655"},
            "items": [
                {"id": "ih-3", "originalFileName": "Notes_Unit3.pdf", "colorMode": "BW", "copies": 1, "paperSize": "A4", "calculatedPages": 25, "duplexMode": "SINGLE", "status": "PRINTED"}
            ]
        }
    ]
    st.session_state.queue_data = mock_queue
    st.session_state.history_data = mock_history
    st.session_state.is_connected = False


# Initial fetch or connect click
if connect_btn or (st.session_state.auth_token is None and not st.session_state.queue_data):
    with st.spinner("Connecting to PrintHub Cloud..."):
        success, msg = login_and_fetch()
        if success:
            st.sidebar.success(msg)
        else:
            st.sidebar.warning("Cloud backend is sleeping or unreachable. Loaded local demo queue.")
            load_mock_data()

# Status indicator
if st.session_state.is_connected:
    st.sidebar.markdown("🟢 **Status:** Connected to Cloud API")
    if st.session_state.shop_info:
        st.sidebar.info(f"Shop: **{st.session_state.shop_info.get('name', 'Apex Print')}**")
else:
    st.sidebar.markdown("🟡 **Status:** Demo / Offline Mode")
    if st.sidebar.button("Switch to Cloud Sync"):
        login_and_fetch()

# --- Process Data with Pandas ---
all_orders = st.session_state.queue_data + st.session_state.history_data

flattened_items = []
for order in all_orders:
    cust = order.get("customer") or {}
    cust_name = cust.get("name", "Guest")
    cust_phone = cust.get("phone", "N/A")
    order_num = order.get("orderNumber", "N/A")
    order_status = order.get("status", "PENDING")
    order_amt = float(order.get("totalAmount", 0.0))
    created = order.get("createdAt", "")

    for item in order.get("items", []):
        flattened_items.append({
            "Order Number": order_num,
            "Customer": cust_name,
            "Phone": cust_phone,
            "File Name": item.get("originalFileName", "document.pdf"),
            "Color Mode": item.get("colorMode", "BW"),
            "Copies": int(item.get("copies", 1)),
            "Pages": int(item.get("calculatedPages", 1)),
            "Paper Size": item.get("paperSize", "A4"),
            "Duplex": item.get("duplexMode", "SINGLE"),
            "Item Status": item.get("status", "PENDING"),
            "Order Status": order_status,
            "Order Total (₹)": order_amt,
            "Timestamp": created
        })

df_items = pd.DataFrame(flattened_items)

# --- Header Section ---
st.title("🖨️ PrintHub Shopkeeper Dashboard")
st.caption("Real-Time Print Spooler, Analytics & Queue Management")

# --- Top KPI Metrics ---
col1, col2, col3, col4 = st.columns(4)

total_revenue = sum(o.get("totalAmount", 0.0) for o in all_orders)
pending_jobs = len(st.session_state.queue_data)
total_files = len(df_items) if not df_items.empty else 0
bw_ratio = 0
if not df_items.empty and "Color Mode" in df_items:
    bw_count = (df_items["Color Mode"] == "BW").sum()
    bw_ratio = int((bw_count / len(df_items)) * 100) if len(df_items) > 0 else 0

with col1:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-lbl">Total Business Volume</div>
        <div class="metric-val">₹{total_revenue:,.2f}</div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-lbl">Pending in Queue</div>
        <div class="metric-val" style="color: #f59e0b;">{pending_jobs} Orders</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-lbl">Total Documents</div>
        <div class="metric-val" style="color: #10b981;">{total_files} Files</div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-lbl">B&W Document Share</div>
        <div class="metric-val" style="color: #a855f7;">{bw_ratio}% B&W</div>
    </div>
    """, unsafe_allow_html=True)

st.write("")

# --- Main Dashboard Tabs ---
tab_queue, tab_analytics, tab_data, tab_simulator = st.tabs([
    "📥 Live FIFO Print Queue",
    "📊 Business Analytics & Charts",
    "📋 Data Explorer (Pandas)",
    "🧪 Print Simulation & QR"
])

# ==========================================
# TAB 1: Live FIFO Print Queue
# ==========================================
with tab_queue:
    st.subheader(f"Current Print Queue ({len(st.session_state.queue_data)} Active Orders)")
    
    if not st.session_state.queue_data:
        st.info("🎉 Print queue is clean! No pending print requests at the moment.")
    else:
        for idx, order in enumerate(st.session_state.queue_data):
            cust = order.get("customer") or {}
            with st.expander(f"#{idx+1} | Order {order.get('orderNumber')} — {cust.get('name', 'Customer')} (₹{order.get('totalAmount', 0):.2f})", expanded=(idx == 0)):
                c1, c2, c3 = st.columns([2, 2, 1])
                with c1:
                    st.write(f"**Customer:** {cust.get('name', 'N/A')}")
                    st.write(f"**Phone:** `{cust.get('phone', 'N/A')}`")
                with c2:
                    st.write(f"**Payment Method:** `{order.get('paymentMethod')}`")
                    st.write(f"**Status:** `{order.get('status')}`")
                with c3:
                    if st.button("Mark Completed", key=f"btn_done_{order.get('id')}"):
                        st.success(f"Order #{order.get('orderNumber')} marked ready!")

                st.write("**Documents in this order:**")
                items = order.get("items", [])
                for it in items:
                    color_badge = "🎨 COLOR" if it.get("colorMode") == "COLOR" else "⬛ B&W"
                    st.markdown(f"- **{it.get('originalFileName')}** — `{color_badge}` | `{it.get('calculatedPages', 1)} pgs` × `{it.get('copies', 1)} copy` | Size: `{it.get('paperSize', 'A4')}` | Duplex: `{it.get('duplexMode', 'SINGLE')}`")

# ==========================================
# TAB 2: Business Analytics & Charts (Pandas + Matplotlib)
# ==========================================
with tab_analytics:
    st.subheader("Printing Analytics & Insights")
    
    if df_items.empty:
        st.warning("No data available to generate charts.")
    else:
        col_c1, col_c2 = st.columns(2)
        
        with col_c1:
            st.markdown("#### 🎨 Color vs. B&W Distribution")
            mode_counts = df_items["Color Mode"].value_counts()
            
            fig1, ax1 = plt.subplots(figsize=(4, 4))
            colors = ["#475569" if m == "BW" else "#8b5cf6" for m in mode_counts.index]
            ax1.pie(mode_counts, labels=mode_counts.index, autopct="%1.1f%%", startangle=90, colors=colors)
            ax1.axis("equal")
            st.pyplot(fig1)

        with col_c2:
            st.markdown("#### 📄 Page Volume by Order")
            fig2, ax2 = plt.subplots(figsize=(5, 4))
            order_pages = df_items.groupby("Order Number")["Pages"].sum()
            order_pages.plot(kind="bar", ax=ax2, color="#0284c7")
            ax2.set_ylabel("Total Pages")
            ax2.set_xlabel("Order ID")
            plt.xticks(rotation=45, ha='right')
            st.pyplot(fig2)

        st.markdown("---")
        st.markdown("#### 📈 Key Statistics (computed via Pandas)")
        stat1, stat2, stat3 = st.columns(3)
        stat1.metric("Average Pages Per File", f"{df_items['Pages'].mean():.1f} pgs")
        stat2.metric("Total Pages Printed", f"{df_items['Pages'].sum()} pgs")
        stat3.metric("Average Order Amount", f"₹{df_items['Order Total (₹)'].mean():.2f}")

# ==========================================
# TAB 3: Data Explorer (Pandas)
# ==========================================
with tab_data:
    st.subheader("Data Explorer")
    if not df_items.empty:
        # Search & Filter
        search_query = st.text_input("🔍 Search documents by file name or customer:", "")
        selected_mode = st.multiselect("Filter Color Mode", options=df_items["Color Mode"].unique(), default=df_items["Color Mode"].unique())
        
        filtered_df = df_items[df_items["Color Mode"].isin(selected_mode)]
        if search_query:
            filtered_df = filtered_df[
                filtered_df["File Name"].str.contains(search_query, case=False, na=False) |
                filtered_df["Customer"].str.contains(search_query, case=False, na=False)
            ]
            
        st.dataframe(filtered_df, use_container_width=True)
        
        # CSV Export button
        csv_data = filtered_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Data as CSV",
            data=csv_data,
            file_name=f"printhub_orders_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
            mime="text/csv"
        )
    else:
        st.info("No records loaded.")

# ==========================================
# TAB 4: Print Simulation & Test
# ==========================================
with tab_simulator:
    st.subheader("🧪 Customer Print Job Simulator")
    st.write("Simulate an incoming print job to test your queue updates in real-time.")
    
    with st.form("simulate_order_form"):
        sim_name = st.text_input("Customer Name", value="Arjun Mehta")
        sim_phone = st.text_input("Customer Phone", value="9876500000")
        sim_file = st.text_input("Document Name", value="Resume_2026.pdf")
        sim_pages = st.number_input("Page Count", min_value=1, max_value=200, value=3)
        sim_copies = st.number_input("Copies", min_value=1, max_value=20, value=1)
        sim_color = st.selectbox("Color Mode", options=["BW", "COLOR"])
        
        price_per_page = 2.0 if sim_color == "BW" else 10.0
        calculated_cost = sim_pages * sim_copies * price_per_page
        st.info(f"Calculated Job Amount: **₹{calculated_cost:.2f}**")
        
        submitted = st.form_submit_button("🚀 Inject Test Order into Queue")
        if submitted:
            new_sim_order = {
                "id": f"sim-{datetime.now().timestamp()}",
                "orderNumber": f"PH-{datetime.now().strftime('%Y%m%d')}-{int(datetime.now().timestamp()) % 10000}",
                "status": "PENDING",
                "totalAmount": calculated_cost,
                "paymentMethod": "SHOP_UPI_QR",
                "paymentStatus": "PAID",
                "createdAt": datetime.now().isoformat(),
                "customer": {"name": sim_name, "phone": sim_phone},
                "items": [
                    {
                        "id": f"sim-item-{datetime.now().timestamp()}",
                        "originalFileName": sim_file,
                        "colorMode": sim_color,
                        "copies": sim_copies,
                        "paperSize": "A4",
                        "calculatedPages": sim_pages,
                        "duplexMode": "SINGLE",
                        "status": "PENDING"
                    }
                ]
            }
            st.session_state.queue_data.insert(0, new_sim_order)
            st.success(f"Order #{new_sim_order['orderNumber']} added to live queue! Check Tab 1.")
            st.rerun()

st.markdown("---")
st.caption("PrintHub Smart Print Python Mini-Project | Powered by Streamlit, Pandas & Requests")
