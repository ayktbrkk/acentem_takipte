#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd ~/frappe-bench/apps/acentem_takipte/frontend
npm install
npm run build

cd ~/frappe-bench
bench clear-cache
bench restart
