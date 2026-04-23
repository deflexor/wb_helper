#!/bin/bash
cd /home/dfr/wbhelper/backend
cabal build 2>&1 | head -100
