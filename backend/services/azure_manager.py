import random
import string
import logging
from azure.identity import DefaultAzureCredential
from azure.mgmt.containerinstance import ContainerInstanceManagementClient
from azure.mgmt.containerinstance.models import (
    ContainerGroup, Container, ContainerPort, Port, IpAddress, 
    ResourceRequests, ResourceRequirements, OperatingSystemTypes,
    ImageRegistryCredential
)
from config import Config

logger = logging.getLogger(__name__)

class AzureContainerManager:
    def __init__(self):
        self.credential = DefaultAzureCredential()
        self.client = ContainerInstanceManagementClient(
            self.credential, 
            Config.SUBSCRIPTION_ID
        )

    def _generate_id(self, length=6) -> str:
        """Internal helper for UIDs generation"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

    def start_lab_instance(self, image_name: str, cpu=1.0, memory=1.0) -> dict:
        """
        Launch an ACI instance and returns details.
        Throw exceptions if something is not working well, to avoid being catch in app.py
        """
        run_id = self._generate_id()
        container_name = f"lab-{run_id}"
        dns_label = container_name

        logger.info(f"Launching container: {container_name} from image {image_name}")

        container_resource = Container(
            name="lab-app",
            image=f"{Config.ACR_SERVER}/{image_name}",
            resources=ResourceRequirements(
                requests=ResourceRequests(cpu=cpu, memory_in_gb=memory)
            ),
            ports=[ContainerPort(port=80)]
        )

        container_group = ContainerGroup(
            location=Config.LOCATION,
            containers=[container_resource],
            os_type=OperatingSystemTypes.linux,
            restart_policy="Never",
            ip_address=IpAddress(
                ports=[Port(protocol="TCP", port=80)],
                type="Public",
                dns_name_label=dns_label
            ),
            image_registry_credentials=[
                ImageRegistryCredential(
                    server=Config.ACR_SERVER,
                    username=Config.ACR_USER,
                    password=Config.ACR_PASSWORD
                )
            ]
        )

        self.client.container_groups.begin_create_or_update(
            Config.RESOURCE_GROUP,
            container_name,
            container_group
        )
        
        url = f"http://{dns_label}.{Config.LOCATION}.azurecontainer.io"
        logger.info(f"The instances was deployed: {url}")

        return {
            "container_name": container_name,
            "url": url,
            "status": "provisioning"
        }