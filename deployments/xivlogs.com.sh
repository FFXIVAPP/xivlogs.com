#!/bin/sh
# ROOT_UID=0
#
# # Run as root
# if [ "$UID" -ne "$ROOT_UID" ]; then
#   echo "Must be root to run this script."
#   exit
# fi

LAUNCH_DIR=${PWD}

systemctl disable xivlogs.com.service
stop xivlogs.com.service

cd ..

rm -rf node_modules/
yarn
# ensure conf files
cd $LAUNCH_DIR
yes | cp -f xivlogs.com.service /etc/systemd/system/xivlogs.com.service
yes | cp -f xivlogs.com.nginx.conf /etc/nginx/conf.d/xivlogs.com.conf

systemctl start xivlogs.com.service
systemctl enable xivlogs.com.service

nginx -s reload
