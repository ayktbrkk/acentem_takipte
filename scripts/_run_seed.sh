#!/bin/bash
cd ~/frappe-bench
bench --site at.localhost execute acentem_takipte.acentem_takipte.dev_seed.reset_and_seed_demo_data --args '[5,1,1,"None",1]'
