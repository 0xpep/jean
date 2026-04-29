#!/bin/bash

# Get the current nvi.cc.yl alias value
current=$(alias nvi.cc.yl 2>/dev/null | sed -n "s/alias nvi.cc.yl='\(.*\)'/\1/p")

# Unalias nvi.cc.yl first
unalias nvi.cc.yl 2>/dev/null

# Re-alias with new command appended (preserve existing && chain)
if [ -n "$current" ]; then
    alias nvi.cc.yl="${current} && $*"
else
    # No existing alias - create new one
    alias nvi.cc.yl="$*"
fi
