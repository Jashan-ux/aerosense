

# ⚡ AeroSense: Wind Turbine Predictive Maintenance Platform

An end-to-end data pipeline and intelligent monitoring platform designed to ingest large-scale industrial time-series datasets, perform physics-based feature engineering, train incremental machine learning models for anomaly detection, and visualize remaining useful life (RUL) metrics in real-time.

---

## 🛠️ Tech Stack

* **Language:** Python
* **Data Processing & ML:** LightGBM, Pandas, NumPy, Parquet
* **Backend & Database:** Supabase (PostgreSQL), FastAPI
* **Frontend & Visualization:** Streamlit, Plotly

---

## 🚀 Key Features

* **Optimized Time-Series Pipeline:** Efficient handling of multi-gigabyte industrial telemetry and parquet datasets to prevent out-of-memory (OOM) failures.
* **Physics-Based Feature Engineering:** Extracts meaningful domain-specific indicators (e.g., aerodynamic load proxies, thermal stress ratios) out of high-dimensional sensor streams (~900 features).
* **Incremental Model Training:** Configured with GPU-accelerated LightGBM to iteratively update models as fresh data streams into the system.
* **Interactive Diagnostic Dashboard:** Real-time visualization of asset health metrics, component anomaly alerts, and performance trends via an embedded Streamlit & Plotly interface.

---

## 📁 Project Structure

```text
aerosense/
│
├── data/               # Raw and processed time-series assets (Parquet format)
├── models/             # Trained incremental LightGBM artifacts
├── pipelines/          # Data ingestion and physics-based feature engineering scripts
├── dashboard/          # Streamlit UI application and Plotly components
├── database/           # Supabase connection schemas and SQL helper utilities
├── requirements.txt    # Project dependencies
└── main.py             # Application entry point

```

---

## ⚙️ Installation & Setup

1. **Clone the Repository:**
```bash
git clone [https://github.com/Jashan-ux/aerosense.git](https://github.com/Jashan-ux/aerosense.git)
cd aerosense

```


2. **Create a Virtual Environment & Install Dependencies:**
```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt

```


3. **Configure Environment Variables:**
Create a `.env` file in the root directory and add your Supabase connection strings and configuration details:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

```



---

## 📊 Usage

1. **Run the Data Pipeline / Feature Engineering:**
```bash
python pipelines/feature_extraction.py

```


2. **Launch the Real-time Dashboard:**
```bash
streamlit run dashboard/app.py

```



---

## 🗺️ Roadmap & Future Enhancements

* [x] High-performance Parquet time-series data processing
* [x] Physics-based feature extraction pipeline
* [x] Incremental training framework via LightGBM
* [x] Supabase integration for centralized asset logging
* [ ] Advanced time-series database indexing for sub-second query speeds
* [ ] Automated alerting system for critical anomaly thresholds

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://www.google.com/search?q=https://github.com/Jashan-ux/aerosense/issues).

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

```

```
