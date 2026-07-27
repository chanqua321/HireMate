#!/usr/bin/env bash
# Paste toàn bộ file này vào Oracle Cloud Shell rồi chạy:
#   bash oci-bootstrap.sh
# Script tự tạo VCN + firewall + VM Always Free (Ampere) cho HireMate BE.
set -euo pipefail

DISPLAY_NAME="hiremate-be"
SSH_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL1j1DSK22HP+6j6UfjEboy9o2xF88Ef62VdlNqNj7eQ hiremate-oracle'

echo "==> Resolve compartment (tenancy root)"
COMPARTMENT_ID=$(oci iam compartment list --include-root \
  --query 'data[0].id' --raw-output)
echo "COMPARTMENT_ID=$COMPARTMENT_ID"

echo "==> Create / reuse VCN"
EXISTING_VCN=$(oci network vcn list --compartment-id "$COMPARTMENT_ID" \
  --display-name hiremate-vcn --query 'data[0].id' --raw-output 2>/dev/null || true)
if [[ -n "${EXISTING_VCN:-}" && "$EXISTING_VCN" != "null" ]]; then
  VCN_ID="$EXISTING_VCN"
  echo "Reuse VCN $VCN_ID"
else
  VCN_ID=$(oci network vcn create --compartment-id "$COMPARTMENT_ID" \
    --display-name hiremate-vcn --cidr-blocks '["10.0.0.0/16"]' \
    --dns-label hiremate --wait-for-state AVAILABLE \
    --query 'data.id' --raw-output)
  echo "Created VCN $VCN_ID"
fi

echo "==> Internet Gateway"
EXISTING_IG=$(oci network internet-gateway list --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" --query 'data[0].id' --raw-output 2>/dev/null || true)
if [[ -n "${EXISTING_IG:-}" && "$EXISTING_IG" != "null" ]]; then
  IG_ID="$EXISTING_IG"
else
  IG_ID=$(oci network internet-gateway create --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" --display-name hiremate-ig --is-enabled true \
    --query 'data.id' --raw-output)
fi

echo "==> Route table (0.0.0.0/0 -> IG)"
RT_ID=$(oci network route-table list --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" --query 'data[0].id' --raw-output)
oci network route-table update --rt-id "$RT_ID" --force \
  --route-rules "[{\"cidrBlock\":\"0.0.0.0/0\",\"networkEntityId\":\"$IG_ID\"}]" \
  >/dev/null

echo "==> Security list (SSH 22 + API 5080)"
SL_ID=$(oci network security-list list --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" --query 'data[0].id' --raw-output)
oci network security-list update --security-list-id "$SL_ID" --force \
  --egress-security-rules '[{"destination":"0.0.0.0/0","protocol":"all","isStateless":false}]' \
  --ingress-security-rules '[
    {"source":"0.0.0.0/0","protocol":"6","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
    {"source":"0.0.0.0/0","protocol":"6","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":5080,"max":5080}}},
    {"source":"0.0.0.0/0","protocol":"1","isStateless":false,"icmpOptions":{"type":3,"code":4}}
  ]' >/dev/null

echo "==> Subnet"
EXISTING_SUBNET=$(oci network subnet list --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" --display-name hiremate-subnet --query 'data[0].id' --raw-output 2>/dev/null || true)
if [[ -n "${EXISTING_SUBNET:-}" && "$EXISTING_SUBNET" != "null" ]]; then
  SUBNET_ID="$EXISTING_SUBNET"
else
  SUBNET_ID=$(oci network subnet create --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" --display-name hiremate-subnet --cidr-block 10.0.1.0/24 \
    --route-table-id "$RT_ID" --security-list-ids "[\"$SL_ID\"]" \
    --dns-label hiresub --wait-for-state AVAILABLE \
    --query 'data.id' --raw-output)
fi
echo "SUBNET_ID=$SUBNET_ID"

echo "==> Ubuntu 22.04 ARM image"
IMAGE_ID=$(oci compute image list --compartment-id "$COMPARTMENT_ID" \
  --operating-system "Canonical Ubuntu" --operating-system-version "22.04" \
  --shape "VM.Standard.A1.Flex" --sort-by TIMECREATED --sort-order DESC \
  --query 'data[0].id' --raw-output)
echo "IMAGE_ID=$IMAGE_ID"

mapfile -t ADS < <(oci iam availability-domain list --compartment-id "$COMPARTMENT_ID" \
  --query 'data[*].name' | jq -r '.[]')

SHAPES=(
  "2:12"
  "1:6"
  "4:24"
)

INSTANCE_ID=""
PUBLIC_IP=""

for shape in "${SHAPES[@]}"; do
  OCPU="${shape%%:*}"
  MEM="${shape##*:}"
  for AD in "${ADS[@]}"; do
    [[ -z "$AD" ]] && continue
    echo "==> Try launch $DISPLAY_NAME on $AD shape ${OCPU}OCPU/${MEM}GB"
    set +e
    OUT=$(oci compute instance launch \
      --availability-domain "$AD" \
      --compartment-id "$COMPARTMENT_ID" \
      --shape "VM.Standard.A1.Flex" \
      --shape-config "{\"ocpus\":$OCPU,\"memoryInGBs\":$MEM}" \
      --display-name "$DISPLAY_NAME" \
      --image-id "$IMAGE_ID" \
      --subnet-id "$SUBNET_ID" \
      --assign-public-ip true \
      --metadata "{\"ssh_authorized_keys\":\"$SSH_PUBKEY\"}" \
      --wait-for-state RUNNING \
      --query 'data.{id:id,state:"lifecycle-state"}' \
      --raw-output 2>&1)
    STATUS=$?
    set -e
    if [[ $STATUS -eq 0 ]]; then
      INSTANCE_ID=$(oci compute instance list --compartment-id "$COMPARTMENT_ID" \
        --display-name "$DISPLAY_NAME" --lifecycle-state RUNNING \
        --query 'data[0].id' --raw-output)
      echo "Instance RUNNING: $INSTANCE_ID"
      break 2
    fi
    echo "Failed on $AD ($OCPU/$MEM): $OUT" | tail -n 3
  done
done

if [[ -z "${INSTANCE_ID:-}" || "$INSTANCE_ID" == "null" ]]; then
  echo "ERROR: Không tạo được VM (thường do Out of capacity Ampere)."
  echo "Thử lại sau vài giờ, hoặc đổi Home Region khi đăng ký account mới."
  exit 1
fi

echo "==> Wait for public IP"
for i in $(seq 1 30); do
  PUBLIC_IP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" \
    --query 'data[0]."public-ip"' --raw-output 2>/dev/null || true)
  if [[ -n "${PUBLIC_IP:-}" && "$PUBLIC_IP" != "null" ]]; then
    break
  fi
  sleep 5
done

echo ""
echo "============================================"
echo " OK — VM HireMate đã lên"
echo " PUBLIC_IP=$PUBLIC_IP"
echo " SSH: ssh -i id_ed25519 ubuntu@$PUBLIC_IP"
echo " Gửi PUBLIC_IP này cho AI để deploy code + Docker."
echo "============================================"

# Save for later
cat > ~/hiremate-oracle-info.txt <<EOF
PUBLIC_IP=$PUBLIC_IP
INSTANCE_ID=$INSTANCE_ID
COMPARTMENT_ID=$COMPARTMENT_ID
SUBNET_ID=$SUBNET_ID
EOF
