import logging
from flask import Flask, jsonify, render_template
from dotenv import load_dotenv

from config import Config
from services.azure_manager import AzureContainerManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

try:
    aci_manager = AzureContainerManager()
except Exception as e:
    logger.error(f"Azure Client init failed: {e}")
    exit(1)

@app.route("/", methods=["GET"])
def home():
    return render_template("dashboard.html")

@app.route("/start-lab", methods=["POST"])
def start_lab():
    try:
        #TODO: Change hardcoded value to dynamic value
        TARGET_IMAGE = "lab-idor:v1"

        result = aci_manager.start_lab_instance(TARGET_IMAGE)
        
        return jsonify({
            "status": "success",
            "message": "Lab is initiating",
            "data": result
        }), 202

    except Exception as e:
        logger.error(f"Error at lab starting: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": "Internal Error on Azure connection."
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)