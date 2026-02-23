#!/bin/bash
# Создание swap 2 ГБ на Ubuntu (выполнять на хост-сервере, не в Docker)
# Запуск: sudo bash swap-setup.sh

set -e

SWAP_SIZE=2G
SWAP_FILE=/swapfile

if [ -f "$SWAP_FILE" ]; then
  echo "Swap уже существует. Текущий статус:"
  swapon --show
  exit 0
fi

echo "Создаём swap-файл ${SWAP_SIZE}..."
fallocate -l "$SWAP_SIZE" "$SWAP_FILE"
chmod 600 "$SWAP_FILE"
mkswap "$SWAP_FILE"
swapon "$SWAP_FILE"

echo "Swap включён:"
swapon --show

# Сделать постоянным после перезагрузки
if ! grep -q "$SWAP_FILE" /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
  echo "Добавлено в /etc/fstab — swap сохранится после перезагрузки"
fi

# По желанию: уменьшить swappiness (по умолчанию 60)
# echo 'vm.swappiness=10' >> /etc/sysctl.conf && sysctl -p
# Это уменьшит использование swap, пока RAM не заполнится
