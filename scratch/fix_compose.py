import yaml
import os

path = "/data/coolify/applications/h1d0pwvazwy9u59vrca160q9/docker-compose.yaml"
with open(path, "r") as f:
    data = yaml.safe_load(f)

# Fix frontend command
data["services"]["frontend"]["command"] = ["sh", "-c", "nginx-entrypoint.sh && nginx -g \"daemon off;\""]

with open(path, "w") as f:
    yaml.dump(data, f)
