#!/bin/bash

set -xe

rm -rf demo/platforms 

./update-android.sh

cd demo && tns debug android
