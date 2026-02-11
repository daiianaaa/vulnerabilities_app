import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID")
    RESOURCE_GROUP = os.getenv("AZURE_RESOURCE_GROUP")
    LOCATION = os.getenv("AZURE_LOCATION")
    
    ACR_SERVER = os.getenv("ACR_SERVER")
    ACR_USER = os.getenv("ACR_USERNAME")
    ACR_PASSWORD = os.getenv("ACR_PASSWORD")
    
    if not all([SUBSCRIPTION_ID, ACR_PASSWORD, ACR_SERVER]):
        raise ValueError("Critical Error: Some files are missing from .env!")