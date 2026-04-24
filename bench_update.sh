#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd ~/frappe-bench
rm -rf sites/assets/acentem_takipte
bench build --app acentem_takipte
bench --site at.localhost migrate
bench --site at.localhost clear-cache
