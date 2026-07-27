#!/usr/bin/env bash
# Run once on Oracle Always Free Ubuntu ARM VM (as ubuntu/opc with sudo).
set -euo pipefail

echo "==> Installing Docker + amd64 emulation (for SQL Server)"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg qemu-user-static binfmt-support

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi

sudo usermod -aG docker "$USER" || true
sudo systemctl enable --now docker
sudo docker run --privileged --rm tonistiigi/binfmt --install amd64

echo "==> Opening firewall port 5080 (API)"
if command -v firewall-cmd >/dev/null 2>&1; then
  sudo firewall-cmd --permanent --add-port=5080/tcp || true
  sudo firewall-cmd --reload || true
elif command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 5080/tcp || true
else
  sudo iptables -I INPUT -p tcp --dport 5080 -j ACCEPT || true
fi

echo ""
echo "Done. Log out/in (or: newgrp docker), then:"
echo "  cd ~/HireMateBE"
echo "  cp .env.example .env && nano .env"
echo "  docker compose up --build -d"
echo "  docker compose ps"
echo "  curl http://localhost:5080/swagger/index.html"
