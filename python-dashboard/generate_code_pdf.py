import os
import shutil
from fpdf import FPDF
from datetime import datetime

class CodePDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(100, 116, 139) # slate-500
            self.cell(0, 8, "PrintHub - Smart Print Python Mini-Project Dashboard", border=0, align="L")
            self.cell(0, 8, "Documentation & Source Code", border=0, align="R")
            self.ln(10)
            self.set_draw_color(226, 232, 240)
            self.line(10, 18, 200, 18)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184) # slate-400
        self.cell(0, 10, f"Page {self.page_no()} of {{nb}}   |   PrintHub Python Project Submission", align="C")

    def chapter_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 41, 59) # slate-800
        self.set_fill_color(241, 245, 249) # slate-100
        self.cell(0, 9, f"  {title}", border=0, fill=True, align="L")
        self.ln(12)

    def chapter_subtitle(self, subtitle):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(15, 23, 42) # slate-900
        self.cell(0, 7, subtitle, border=0, align="L")
        self.ln(8)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85) # slate-700
        self.multi_cell(0, 6, text)
        self.ln(4)

    def bullet_point(self, title, description):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(15, 23, 42)
        self.cell(6, 6, chr(149), border=0)
        self.cell(45, 6, f"{title}:", border=0)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 6, description)
        self.ln(2)

    def code_block(self, code_text):
        self.set_fill_color(248, 250, 252) # slate-50
        self.set_draw_color(203, 213, 225) # slate-300
        self.set_font("Courier", "", 7.5)
        self.set_text_color(15, 23, 42)
        
        lines = code_text.split("\n")
        line_num = 1
        for line in lines:
            # Check for page break space
            if self.get_y() > 270:
                self.add_page()
            
            # Line number
            self.set_text_color(148, 163, 184)
            self.cell(10, 4.2, f"{line_num:3d} |", border=0, align="R")
            
            # Code content (sanitize characters for standard latin1)
            sanitized = line.encode('latin-1', 'replace').decode('latin-1')
            self.set_text_color(30, 41, 59)
            self.cell(0, 4.2, f"  {sanitized}", border=0, align="L")
            self.ln(4.2)
            line_num += 1
        self.ln(6)

def generate_pdf():
    pdf = CodePDF(orientation='P', unit='mm', format='A4')
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    
    # ---------------------------------------------
    # PAGE 1: TITLE & COVER PAGE
    # ---------------------------------------------
    pdf.add_page()
    pdf.ln(15)
    
    # Decorative Header Tag
    pdf.set_fill_color(79, 70, 229) # indigo-600
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(50, 7, " PYTHON MINI-PROJECT ", border=0, fill=True, align="C")
    pdf.ln(12)
    
    # Title
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(0, 10, "PrintHub - Smart Print Analytics & Live Queue Dashboard")
    pdf.ln(4)
    
    # Subtitle
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(0, 7, "An interactive real-time shopkeeper dashboard and business intelligence tool built using Streamlit, Pandas, and Requests.")
    pdf.ln(8)
    
    pdf.set_draw_color(203, 213, 225)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(10)
    
    # Project Metadata Table
    pdf.chapter_subtitle("Project Specifications & Technology Stack")
    pdf.bullet_point("Project Name", "PrintHub Smart Print Dashboard")
    pdf.bullet_point("Framework", "Streamlit (v1.63.0) - Interactive Web Application")
    pdf.bullet_point("Data Engine", "Pandas (v3.0.5) - Tabular Manipulation & Metrics Aggregation")
    pdf.bullet_point("Cloud Integration", "Requests (v2.34.2) - REST API / JWT Authentication")
    pdf.bullet_point("Visual Graphics", "Matplotlib (v3.11.2) - Data Visualization Charts")
    pdf.bullet_point("Target Platform", "Python 3.10+ / Windows 10 & 11")
    pdf.bullet_point("Creation Date", datetime.now().strftime("%B %d, %Y"))
    pdf.ln(6)
    
    # Overview Summary
    pdf.chapter_subtitle("Executive Summary")
    pdf.body_text(
        "This project implements a complete, modern Python analytics and queue management dashboard for xerox and printing shopkeepers. "
        "It connects directly to the PrintHub Cloud API via secure JWT token authentication, streams real-time customer print requests, "
        "calculates revenue metrics and paper consumption, and displays live visual insights like Color vs. Black & White breakdown."
    )
    
    # ---------------------------------------------
    # PAGE 2: ARCHITECTURE & SYSTEM DESIGN
    # ---------------------------------------------
    pdf.add_page()
    pdf.chapter_title("1. System Architecture & Library Integration")
    
    pdf.chapter_subtitle("Role of the 3 Core Libraries:")
    
    pdf.bullet_point(
        "Streamlit", 
        "Acts as the presentation layer. Handles reactive UI components, sidebar controls, KPI metric display cards, "
        "tabbed layouts, and interactive simulation triggers without requiring HTML/CSS boilerplate."
    )
    
    pdf.bullet_point(
        "Pandas", 
        "Serves as the data processing and analytics core. Converts nested JSON print orders into flat DataFrames, "
        "filters by color mode, computes descriptive statistics (mean page count, total revenue, ratios), and provides one-click CSV exports."
    )
    
    pdf.bullet_point(
        "Requests", 
        "Functions as the network communication bridge. Sends POST /api/auth/login payloads to authenticate shopkeepers, "
        "acquires Bearer JWT tokens, and executes GET /api/orders/shop/queue requests to sync live cloud orders."
    )
    pdf.ln(4)
    
    pdf.chapter_subtitle("Key Dashboard Features:")
    features = [
        "Live FIFO Print Queue: Displays pending customer files, copies, page numbers, duplex specs, and phone numbers.",
        "Revenue & Volume KPIs: Computes total sales (INR), pending order counts, and B&W document percentage.",
        "Visual Analytics: Generates pie charts for Color vs B&W share and bar graphs for page consumption.",
        "Search & Filtering: Instant tabular search across file names and customer identities with CSV export.",
        "Order Simulator: Interactive customer print request simulator to test queue additions without network calls."
    ]
    for feat in features:
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(51, 65, 85)
        pdf.cell(5, 5, chr(149), border=0)
        pdf.multi_cell(0, 5, feat)
        pdf.ln(2)
        
    pdf.ln(4)
    pdf.chapter_subtitle("How to Run:")
    pdf.body_text(
        "1. Open terminal in the project directory:\n"
        "   cd \"c:\\smart print\\python-dashboard\"\n"
        "2. Launch the Streamlit server:\n"
        "   python -m streamlit run app.py\n"
        "3. Or simply double-click 'run_dashboard.bat' to launch in your default web browser at http://localhost:8501."
    )
    
    # ---------------------------------------------
    # PAGES 3+: SOURCE CODE
    # ---------------------------------------------
    pdf.add_page()
    pdf.chapter_title("2. Complete Python Source Code (app.py)")
    pdf.body_text("Below is the complete, unmodified source code for the Streamlit dashboard application:")
    
    app_py_path = os.path.join(os.path.dirname(__file__), "app.py")
    if os.path.exists(app_py_path):
        with open(app_py_path, "r", encoding="utf-8") as f:
            code_content = f.read()
        pdf.code_block(code_content)
    else:
        pdf.body_text("Source code file app.py not found.")
        
    # Requirements & Launcher Script
    pdf.add_page()
    pdf.chapter_title("3. Supporting Configuration & Launcher Scripts")
    
    pdf.chapter_subtitle("A. requirements.txt")
    req_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    if os.path.exists(req_path):
        with open(req_path, "r", encoding="utf-8") as f:
            pdf.code_block(f.read())
            
    pdf.chapter_subtitle("B. run_dashboard.bat (1-Click Launcher)")
    bat_path = os.path.join(os.path.dirname(__file__), "run_dashboard.bat")
    if os.path.exists(bat_path):
        with open(bat_path, "r", encoding="utf-8") as f:
            pdf.code_block(f.read())

    # Output File Destinations
    out_dir = os.path.dirname(__file__)
    pdf_filename = "PrintHub_Python_Dashboard_Project.pdf"
    target_path = os.path.join(out_dir, pdf_filename)
    pdf.output(target_path)
    
    # Also copy to Downloads folder for immediate user access
    downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
    download_target = os.path.join(downloads_dir, pdf_filename)
    try:
        shutil.copyfile(target_path, download_target)
    except Exception as e:
        print("Copy error:", e)
        
    print(f"PDF_GENERATED: {target_path}")
    print(f"DOWNLOADS_COPY: {download_target}")

if __name__ == "__main__":
    generate_pdf()
