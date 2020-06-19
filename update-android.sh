#!/bin/bash

set -xe

pushd src
npm run build || true
popd

if [ -d ../fk-networking ]; then
	pushd ../fk-networking
	./gradlew clean build
	cp ./app/build/outputs/aar/app-debug.aar ../nativescript-conservify/src/platforms/android/fk-networking.aar
	popd
else
	echo "missing fk-networking"
fi
